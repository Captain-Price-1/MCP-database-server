#!/usr/bin/env node

/**
 * Claude Agent API Server
 * REST API for Laravel applications to interact with MCP Database + Chart servers
 */

import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Session storage for conversation history
// Each session now stores the SDK's native sessionId
const sessions = new Map();

/**
 * Get or create session
 */
function getSession(sessionId) {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      sdkSessionId: null, // Store the SDK's session ID here
      createdAt: new Date(),
      lastActivity: new Date()
    });
  }
  
  const session = sessions.get(sessionId);
  session.lastActivity = new Date();
  return session;
}

/**
 * Clean up old sessions (older than 1 hour)
 */
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastActivity.getTime() < oneHourAgo) {
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * Check if user explicitly requested SMS/Email actions
 */
function extractActionRequest(userPrompt, assistantResponse) {
  const actions = [];
  
  // Check if user EXPLICITLY asked to send SMS
  const smsKeywords = /send\s+(?:an?\s+)?sms|text\s+message|notify.*sms|sms.*to/i;
  const emailKeywords = /send\s+(?:an?\s+)?email|email.*to|notify.*email/i;
  
  const userWantsSMS = smsKeywords.test(userPrompt);
  const userWantsEmail = emailKeywords.test(userPrompt);
  
  if (!userWantsSMS && !userWantsEmail) {
    return actions; // No action requested
  }
  
  // Extract user IDs from response (look for tables, lists, or explicit IDs in prompt/response)
  let userIds = [];
  
  // Try to extract from response (table format, lists, etc.)
  const userIdPatterns = [
    /user\s+id[:\s]+(\d+)/gi,
    /\|\s*(\d+)\s*\|\s*\d+/g, // Table format: | 123 | count |
    /ids?[:\s]+([\d,\s]+)/gi,
    /\(([\d,\s]+)\)/g // IDs in parentheses
  ];
  
  userIdPatterns.forEach(pattern => {
    const matches = assistantResponse.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const ids = match.match(/\d+/g);
        if (ids) {
          userIds.push(...ids.map(Number));
        }
      });
    }
  });
  
  // Also check prompt for explicit IDs
  const promptIds = userPrompt.match(/users?\s+(\d+(?:\s*,\s*\d+)*)/gi);
  if (promptIds) {
    promptIds.forEach(match => {
      const ids = match.match(/\d+/g);
      if (ids) {
        userIds.push(...ids.map(Number));
      }
    });
  }
  
  // Remove duplicates and filter valid IDs
  userIds = [...new Set(userIds)].filter(id => id > 0);
  
  // Extract message content if provided in prompt
  let message = '';
  const messageMatch = userPrompt.match(/message[:\s]+"([^"]+)"|saying[:\s]+"([^"]+)"|sms[:\s]+"([^"]+)"/i);
  if (messageMatch) {
    message = messageMatch[1] || messageMatch[2] || messageMatch[3] || '';
  }
  
  // Create SMS action if requested and we have user IDs
  if (userWantsSMS && userIds.length > 0) {
    actions.push({
      type: 'send_sms',
      user_ids: userIds,
      message: message || 'Thank you for your loyalty!',
      reason: 'User explicitly requested SMS sending'
    });
  }
  
  // Create Email action if requested
  if (userWantsEmail && userIds.length > 0) {
    let subject = 'Notification';
    const subjectMatch = userPrompt.match(/subject[:\s]+"([^"]+)"/i);
    if (subjectMatch) {
      subject = subjectMatch[1];
    }
    
    const emailMsgMatch = userPrompt.match(/email[:\s]+"([^"]+)"|message[:\s]+"([^"]+)"/i);
    if (emailMsgMatch) {
      message = emailMsgMatch[1] || emailMsgMatch[2] || message;
    }
    
    actions.push({
      type: 'send_email',
      user_ids: userIds,
      subject: subject,
      message: message || 'Thank you for your business!',
      reason: 'User explicitly requested email sending'
    });
  }
  
  return actions;
}

/**
 * Process query and return clean result
 */
async function processQuery(userPrompt, session) {
  // Force single model
  process.env.ANTHROPIC_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = config.anthropic.model;

  try {
    // Build query options - ALWAYS include mcpServers for tools access
    const queryOptions = {
      apiKey: config.anthropic.apiKey,
      model: config.anthropic.model,
      maxTokens: config.anthropic.maxTokens,
      permissionMode: 'bypassPermissions',
      autoStart: config.sdk.autoStart,
      mcpServers: [
        // Database MCP Server
        {
          type: 'stdio',
          command: 'node',
          args: [config.mcp.serverPath, ...config.mcp.serverArgs],
          env: {
            NODE_ENV: 'production',
            DEBUG: 'false'
          }
        },
        // Chart Generation MCP Server
        {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@antv/mcp-server-chart'],
          env: {
            NODE_ENV: 'production'
          }
        },
        // Laravel Actions MCP Server (SMS, Email)
        {
          type: 'stdio',
          command: 'node',
          args: [join(__dirname, 'customTools.js')],
          env: {
            NODE_ENV: 'production'
          }
        }
      ]
    };

    // Resume previous session to maintain conversation context
    // The SDK's 'resume' parameter loads the full conversation history
    if (session.sdkSessionId) {
      queryOptions.resume = session.sdkSessionId;
      console.log('[SESSION] Resuming session:', session.sdkSessionId);
    } else {
      console.log('[SESSION] Starting new session');
    }

    // Add system instructions if user asks for SMS/Email
    let enhancedPrompt = userPrompt;
    if (/send|notify|text|sms|email/i.test(userPrompt)) {
      enhancedPrompt = `${userPrompt}

IMPORTANT: You have access to send_sms and send_email tools. When the user asks to send messages, you MUST use these tools instead of just saying you'll send them. Call the tools with the appropriate user IDs and message content.`;
    }

    // Create query stream
    const queryStream = query({
      prompt: enhancedPrompt,
      options: queryOptions
    });

    let assistantResponse = '';
    let toolsUsed = [];
    let chartUrls = [];
    let cost = 0;
    let turns = 0;
    let allMessages = [];
    let availableTools = [];

    // Collect response
    for await (const message of queryStream) {
      // Store all messages for debugging
      allMessages.push(message);

      // Capture the SDK session ID from the init message
      if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
        session.sdkSessionId = message.session_id;
        console.log('[SESSION] ✅ Captured SDK session ID:', message.session_id);
      }

      // Log all system messages to see what's happening
      if (message.type === 'system') {
        console.log('[SYSTEM]', message.subtype || 'unknown', JSON.stringify(message).substring(0, 200));
        
        // Track available tools
        if (message.tools && Array.isArray(message.tools)) {
          message.tools.forEach(tool => {
            if (tool.name && !availableTools.includes(tool.name)) {
              availableTools.push(tool.name);
              console.log('[TOOL] Available:', tool.name);
            }
          });
        }
      }

      // Log message for debugging (only if DEBUG=true)
      if (process.env.DEBUG === 'true') {
        console.log('[API DEBUG] Message type:', message.type);
        if (message.content) {
          console.log('[API DEBUG] Has content:', Array.isArray(message.content) ? message.content.length + ' items' : 'object');
        }
      }

      // Extract result text
      if (message.type === 'resultMessage' || message.type === 'result') {
        if (message.result) {
          assistantResponse += message.result;
        }
      }

      // Track text responses
      if (message.text) {
        assistantResponse += message.text;
      }

      // Track tool usage and extract chart URLs from ANY message with content
      if (message.content) {
        const content = Array.isArray(message.content) ? message.content : [message.content];
        content.forEach(block => {
          // Track tool usage
          if (block.type === 'tool_use') {
            const toolName = block.name || 'unknown';
            toolsUsed.push({
              name: toolName,
              id: block.id
            });
          }

          // Extract chart URLs from tool results
          if (block.type === 'tool_result') {
            if (process.env.DEBUG === 'true') {
              console.log('[API DEBUG] Tool result:', typeof block.content, JSON.stringify(block.content).substring(0, 200));
            }

            try {
              // Handle both string and object content
              let toolContent = block.content;
              
              // If it's an array, check each item
              if (Array.isArray(toolContent)) {
                toolContent.forEach(item => {
                  if (typeof item === 'object' && item.type === 'text' && item.text) {
                    // Check if the text contains a URL
                    const urlMatch = item.text.match(/(https?:\/\/[^\s]+)/g);
                    if (urlMatch) {
                      urlMatch.forEach(url => chartUrls.push(url));
                    }
                  }
                });
                return;
              }
              
              // If it's a string, try to parse it as JSON
              if (typeof toolContent === 'string') {
                // First, check if it directly contains a URL
                const urlMatch = toolContent.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch) {
                  urlMatch.forEach(url => chartUrls.push(url));
                  return;
                }
                
                // Try to parse as JSON
                try {
                  toolContent = JSON.parse(toolContent);
                } catch (e) {
                  // Not JSON, skip
                  return;
                }
              }
              
              // Check for chart URL in various possible fields
              if (toolContent && typeof toolContent === 'object') {
                if (toolContent.resultObj && typeof toolContent.resultObj === 'string' && toolContent.resultObj.includes('http')) {
                  chartUrls.push(toolContent.resultObj);
                } else if (toolContent.url && toolContent.url.includes('http')) {
                  chartUrls.push(toolContent.url);
                } else if (toolContent.chartUrl && toolContent.chartUrl.includes('http')) {
                  chartUrls.push(toolContent.chartUrl);
                } else if (toolContent.image && toolContent.image.includes('http')) {
                  chartUrls.push(toolContent.image);
                }
              }
            } catch (e) {
              if (process.env.DEBUG === 'true') {
                console.log('[API DEBUG] Error extracting chart URL:', e.message);
              }
            }
          }
        });
      }

      // Track costs
      if (message.total_cost_usd) {
        cost = message.total_cost_usd;
      }

      // Track turns
      if (message.num_turns) {
        turns = message.num_turns;
      }
    }

    // Log final chart URLs found
    if (process.env.DEBUG === 'true') {
      console.log('[API DEBUG] Chart URLs from tool results:', chartUrls.length, chartUrls);
    }

    // FALLBACK 1: Extract chart URLs from the response text itself
    if (assistantResponse) {
      // Extract from markdown images: ![text](url)
      const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
      let match;
      while ((match = markdownImageRegex.exec(assistantResponse)) !== null) {
        const url = match[1];
        if (!chartUrls.includes(url)) {
          chartUrls.push(url);
          if (process.env.DEBUG === 'true') {
            console.log('[API DEBUG] Found chart URL in markdown:', url);
          }
        }
      }

      // Also look for plain URLs from known chart domains
      const plainUrlRegex = /(https?:\/\/(?:mdn\.alipayobjects\.com|cdn\.alipay\.com)[^\s\)]+)/g;
      while ((match = plainUrlRegex.exec(assistantResponse)) !== null) {
        const url = match[1];
        if (!chartUrls.includes(url)) {
          chartUrls.push(url);
          if (process.env.DEBUG === 'true') {
            console.log('[API DEBUG] Found chart URL in response text:', url);
          }
        }
      }
    }

    // FALLBACK 2: Deep search through ALL messages for any chart URLs
    if (chartUrls.length === 0 && allMessages.length > 0) {
      if (process.env.DEBUG === 'true') {
        console.log('[API DEBUG] No charts found yet, doing deep search through', allMessages.length, 'messages');
      }

      for (const msg of allMessages) {
        // Convert entire message to string and search for URLs
        const msgStr = JSON.stringify(msg);
        const urlRegex = /(https?:\/\/(?:mdn\.alipayobjects\.com|cdn\.alipay\.com)[^\s"'\)]+)/g;
        let match;
        while ((match = urlRegex.exec(msgStr)) !== null) {
          const url = match[1];
          if (!chartUrls.includes(url)) {
            chartUrls.push(url);
            if (process.env.DEBUG === 'true') {
              console.log('[API DEBUG] Found chart URL in message (deep search):', url);
              console.log('[API DEBUG] Message type was:', msg.type);
            }
          }
        }
      }
    }

    if (process.env.DEBUG === 'true') {
      console.log('[API DEBUG] Final chart URLs (after all extraction):', chartUrls.length, chartUrls);
      
      // Save all messages to a file for debugging
      if (chartUrls.length === 0 && allMessages.length > 0) {
        const fs = await import('fs');
        const debugFile = `/tmp/mcp-debug-${Date.now()}.json`;
        fs.writeFileSync(debugFile, JSON.stringify(allMessages, null, 2));
        console.log('[API DEBUG] Saved all messages to:', debugFile);
      }
    }

    // Extract actions ONLY if user explicitly requested SMS/Email in their prompt
    const extractedActions = extractActionRequest(userPrompt, assistantResponse);

    // Log final summary
    console.log('[SUMMARY] Tools available:', availableTools.length, availableTools);
    console.log('[SUMMARY] Tools used:', toolsUsed.length, toolsUsed.map(t => t.name));
    console.log('[SUMMARY] Actions captured:', extractedActions.length);
    if (extractedActions.length > 0) {
      console.log('[ACTION] ✅ User explicitly requested actions:', extractedActions.length);
      extractedActions.forEach(action => {
        console.log(`[ACTION] ${action.type} for ${action.user_ids.length} users`);
      });
    }

    const result = {
      success: true,
      response: assistantResponse,
      charts: chartUrls,
      actions: extractedActions, // Only populated when user explicitly requests
      metadata: {
        toolsUsed: toolsUsed.map(t => t.name),
        availableTools: availableTools,
        cost: cost,
        turns: turns,
        sessionId: session.id,
        hasActions: extractedActions.length > 0
      }
    };

    // Add debug info if DEBUG env is set
    if (process.env.DEBUG === 'true') {
      result.debug = {
        messageCount: allMessages.length,
        toolsUsedDetailed: toolsUsed,
        chartUrlsFound: chartUrls.length
      };
    }

    return result;

  } catch (error) {
    return {
      success: false,
      error: error.message,
      response: null
    };
  }
}

// Routes

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'claude-agent-api',
    version: '1.0.0',
    activeSessions: sessions.size
  });
});

/**
 * Test MCP tools availability
 */
app.get('/tools', async (req, res) => {
  try {
    // Create a test query stream to list available tools
    const queryStream = query({
      prompt: 'List all available MCP tools',
      options: {
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        maxTokens: 1000,
        permissionMode: 'bypassPermissions',
        autoStart: config.sdk.autoStart,
        mcpServers: [
          {
            type: 'stdio',
            command: 'node',
            args: [config.mcp.serverPath, ...config.mcp.serverArgs],
            env: { NODE_ENV: 'production', DEBUG: 'false' }
          },
          {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@antv/mcp-server-chart'],
            env: { NODE_ENV: 'production' }
          }
        ]
      }
    });

    let response = '';
    for await (const message of queryStream) {
      if (message.result) response += message.result;
      if (message.text) response += message.text;
    }

    res.json({
      success: true,
      response: response,
      message: 'Check the response to see if chart tools are available'
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Query endpoint
 */
app.post('/query', async (req, res) => {
  try {
    const { prompt, sessionId, newSession } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Get or create session
    let session;
    if (newSession) {
      // Force new session
      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = getSession(newId);
      console.log('[SESSION] Created new session:', newId);
    } else {
      session = getSession(sessionId);
      console.log('[SESSION] Using session:', session.id, 'SDK Session:', session.sdkSessionId || 'none');
    }

    // Process query
    const result = await processQuery(prompt, session);

    res.json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Clear session
 */
app.post('/session/clear', (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }

  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    res.json({
      success: true,
      message: 'Session cleared'
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }
});

/**
 * Get session info
 */
app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  const session = sessions.get(sessionId);
  res.json({
    success: true,
    session: {
      id: session.id,
      sdkSessionId: session.sdkSessionId,
      hasContext: !!session.sdkSessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }
  });
});

// Start server
async function startServer() {
  try {
    // Validate configuration
    validateConfig();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║     🚀 Claude Agent API Server                    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

✅ Server running on port ${PORT}

📋 Configuration:
   Claude Model: ${config.anthropic.model}
   Database: ${config.database.type}
   MCP Server: ${config.mcp.serverPath}

📡 Endpoints:
   GET  /health              - Health check
   POST /query               - Process query
   POST /session/clear       - Clear session
   GET  /session/:sessionId  - Get session info

🔧 MCP Tools:
   ✅ Database queries
   ✅ Chart generation  
   ✅ SMS actions (send_sms)
   ✅ Email actions (send_email)

💡 Ready to receive requests from Laravel!
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.log('\n💡 Please check your configuration in .env file');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

