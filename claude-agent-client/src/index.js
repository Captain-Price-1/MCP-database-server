#!/usr/bin/env node

/**
 * Claude Agent Client - Interactive CLI
 * Uses Claude Agent SDK to interact with MCP Database Server
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import readline from 'readline';
import { config, validateConfig, displayConfig } from './config.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Format message for display
 */
function formatMessage(message) {
  switch (message.type) {
    case 'assistantMessage':
    case 'assistant':
      if (message.content) {
        const content = Array.isArray(message.content) ? message.content : [message.content];
        content.forEach(block => {
          if (typeof block === 'string') {
            console.log(`${colors.cyan}Claude:${colors.reset} ${block}`);
          } else if (block.type === 'text') {
            console.log(`${colors.cyan}Claude:${colors.reset} ${block.text}`);
          } else if (block.type === 'thinking') {
            if (config.sdk.verbose) {
              console.log(`${colors.magenta}💭 Thinking:${colors.reset} ${block.thinking}`);
            }
          } else if (block.type === 'tool_use') {
            console.log(`${colors.yellow}🔧 Using tool: ${block.name}${colors.reset}`);
          } else if (block.type === 'tool_result') {
            console.log(`${colors.yellow}📊 Tool result received${colors.reset}`);
            // Try to display the content of tool result
            if (block.content) {
              console.log(JSON.stringify(block.content, null, 2));
            }
          }
        });
      }
      if (message.text) {
        console.log(`${colors.cyan}Claude:${colors.reset} ${message.text}`);
      }
      break;

    case 'partialAssistantMessage':
      if (message.delta) {
        process.stdout.write(message.delta);
      }
      if (message.text) {
        process.stdout.write(message.text);
      }
      break;

    case 'resultMessage':
    case 'result':
      // The actual result is in message.result, not message.content!
      console.log(`\n${colors.cyan}${colors.bright}📋 Claude's Answer:${colors.reset}`);
      if (message.result) {
        console.log(`${colors.cyan}${message.result}${colors.reset}\n`);
      }
      
      // Show permission denials if any
      if (message.permission_denials && message.permission_denials.length > 0) {
        console.log(`${colors.red}⚠️  Tool calls were denied! Permission mode needs to be set to 'bypassPermissions'${colors.reset}`);
        console.log(`${colors.yellow}Denied tools:${colors.reset}`);
        message.permission_denials.forEach(denial => {
          console.log(`  - ${denial.tool_name}`);
        });
        console.log('');
      }
      
      // Show which models were used and their costs
      if (message.modelUsage) {
        console.log(`${colors.yellow}🤖 Models Used:${colors.reset}`);
        Object.entries(message.modelUsage).forEach(([model, usage]) => {
          if (usage.inputTokens > 0 || usage.outputTokens > 0) {
            const modelName = model.split('-').slice(1, 3).join(' ').toUpperCase();
            console.log(`  ${modelName}: $${usage.costUSD.toFixed(4)} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);
          }
        });
        console.log('');
      }
      
      // Show total cost
      if (message.total_cost_usd) {
        console.log(`${colors.yellow}💰 Total Cost: $${message.total_cost_usd.toFixed(4)}${colors.reset}`);
      }
      
      // Show number of turns (indicator of efficiency)
      if (message.num_turns) {
        console.log(`${colors.yellow}🔄 Conversation Turns: ${message.num_turns}${colors.reset}`);
      }
      break;

    case 'userMessage':
    case 'user':
      console.log(`${colors.green}You:${colors.reset} ${message.content}`);
      break;

    case 'permissionDenial':
      console.log(`${colors.red}⚠️  Permission Denied:${colors.reset} ${message.reason}`);
      break;

    case 'system':
      // System messages - usually empty, skip
      break;

    case 'finalMessage':
    case 'final':
      console.log(`${colors.cyan}📋 Final Response:${colors.reset}`);
      if (message.text) {
        console.log(message.text);
      }
      if (message.content) {
        const content = Array.isArray(message.content) ? message.content : [message.content];
        content.forEach(block => {
          if (typeof block === 'string') {
            console.log(block);
          } else if (block.text) {
            console.log(block.text);
          } else {
            console.log(JSON.stringify(block, null, 2));
          }
        });
      }
      break;

    default:
      // Catchall: Show EVERYTHING in default case
      console.log(`${colors.yellow}[UNKNOWN TYPE: ${message.type}]${colors.reset}`);
      if (message.text) {
        console.log(`TEXT: ${message.text}`);
      }
      if (message.content) {
        console.log(`CONTENT:`, JSON.stringify(message.content, null, 2));
      }
      if (message.delta) {
        console.log(`DELTA: ${message.delta}`);
      }
      // Show all properties
      console.log('FULL MESSAGE:', JSON.stringify(message, null, 2));
  }
}

/**
 * Process user query with Claude Agent SDK
 */
async function processQuery(userPrompt) {
  console.log(`\n${colors.blue}🔄 Processing query...${colors.reset}\n`);

  try {
    // Force single model by setting environment variables
    process.env.ANTHROPIC_MODEL = config.anthropic.model;
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = config.anthropic.model;
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = config.anthropic.model;
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = config.anthropic.model;
    
    // Create query stream
    const queryStream = query({
      prompt: userPrompt,
      options: {
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        maxTokens: config.anthropic.maxTokens,
        permissionMode: 'bypassPermissions', // Always allow tools without asking
        autoStart: config.sdk.autoStart,
        mcpServers: [
          {
            type: 'stdio',
            command: 'node',
            args: [config.mcp.serverPath, ...config.mcp.serverArgs],
            env: {
              NODE_ENV: 'production',
              DEBUG: config.sdk.debug ? 'true' : 'false'
            }
          }
        ]
      }
    });

    let hasOutput = false;
    let toolResults = [];
    
    // Stream and display messages
    for await (const message of queryStream) {
      formatMessage(message);
      
      // Collect tool results
      if (message.type === 'result' && message.content) {
        toolResults.push(message.content);
        hasOutput = true;
      }
      
      // Track if we got any actual output
      if (message.text || (message.content && (typeof message.content === 'string' || Array.isArray(message.content)))) {
        hasOutput = true;
      }
    }

    // If we collected tool results but saw no output, display them
    if (toolResults.length > 0 && !hasOutput) {
      console.log(`\n${colors.cyan}📊 Results:${colors.reset}`);
      toolResults.forEach(result => {
        if (typeof result === 'string') {
          console.log(result);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      });
    }

    console.log(`\n${colors.green}✅ Query complete!${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error:${colors.reset} ${error.message}`);
    if (config.sdk.debug) {
      console.error(error.stack);
    }
  }
}

/**
 * Main interactive loop
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🤖 Claude Agent Client with MCP Database         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validate configuration
  try {
    validateConfig();
    displayConfig();
  } catch (error) {
    console.error(`${colors.red}❌ ${error.message}${colors.reset}\n`);
    console.log(`${colors.yellow}💡 Please copy env.example to .env and configure your settings${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Claude Agent Client ready!${colors.reset}`);
  console.log(`${colors.yellow}💡 Type your natural language queries or "help" for commands${colors.reset}\n`);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.bright}> ${colors.reset}`
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle special commands
    switch (input.toLowerCase()) {
      case 'help':
        console.log(`
${colors.cyan}Available Commands:${colors.reset}
  ${colors.green}help${colors.reset}     - Show this help message
  ${colors.green}quit${colors.reset}     - Exit the application
  ${colors.green}exit${colors.reset}     - Exit the application
  ${colors.green}clear${colors.reset}    - Clear the screen
  ${colors.green}config${colors.reset}   - Show current configuration
  ${colors.green}debug${colors.reset}    - Toggle debug mode

${colors.cyan}Example Queries:${colors.reset}
  - How many tables are in the database?
  - Show me all records from the users table
  - What are the family bookings in 2023?
  - Which service was most used in October 2023?
  - Give me the top 10 users by reservations
        `);
        break;

      case 'quit':
      case 'exit':
        console.log(`\n${colors.yellow}👋 Goodbye!${colors.reset}\n`);
        process.exit(0);
        break;

      case 'clear':
        console.clear();
        break;

      case 'config':
        displayConfig();
        break;

      case 'debug':
        config.sdk.debug = !config.sdk.debug;
        console.log(`${colors.yellow}🐛 Debug mode: ${config.sdk.debug ? 'ON' : 'OFF'}${colors.reset}`);
        break;

      default:
        // Process as query
        await processQuery(input);
        break;
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${colors.yellow}👋 Goodbye!${colors.reset}\n`);
    process.exit(0);
  });

  // Handle errors
  process.on('uncaughtException', (error) => {
    console.error(`\n${colors.red}❌ Uncaught Exception:${colors.reset}`, error.message);
    if (config.sdk.debug) {
      console.error(error.stack);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`\n${colors.red}❌ Unhandled Rejection:${colors.reset}`, reason);
  });
}

// Run the application
main().catch(error => {
  console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error.message);
  process.exit(1);
});

