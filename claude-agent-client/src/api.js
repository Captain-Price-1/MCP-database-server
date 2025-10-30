#!/usr/bin/env node

/**
 * Claude Agent API Server
 * REST API for Laravel applications to interact with MCP Database + Chart servers
 */

import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig } from './config.js';

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Session storage for conversation history
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
      history: [],
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
 * Process query and return clean result
 */
async function processQuery(userPrompt, session) {
  // Force single model
  process.env.ANTHROPIC_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = config.anthropic.model;
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = config.anthropic.model;

  // Add user message to history
  session.history.push({
    role: 'user',
    content: userPrompt
  });

  try {
    // Create query stream
    const queryStream = query({
      prompt: userPrompt,
      conversationHistory: session.history.slice(0, -1),
      options: {
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
          }
        ]
      }
    });

    let assistantResponse = '';
    let toolsUsed = [];
    let chartUrls = [];
    let cost = 0;
    let turns = 0;
    let allMessages = [];

    // Collect response
    for await (const message of queryStream) {
      // Store all messages for debugging
      allMessages.push(message);

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
            
            if (process.env.DEBUG === 'true') {
              console.log('[API DEBUG] Tool used:', toolName);
            }
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

    // Add assistant response to history
    if (assistantResponse) {
      session.history.push({
        role: 'assistant',
        content: assistantResponse
      });
    }

    const result = {
      success: true,
      response: assistantResponse,
      charts: chartUrls,
      metadata: {
        toolsUsed: toolsUsed.map(t => t.name),
        cost: cost,
        turns: turns,
        sessionId: session.id
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
    } else {
      session = getSession(sessionId);
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
      messageCount: session.history.length,
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

