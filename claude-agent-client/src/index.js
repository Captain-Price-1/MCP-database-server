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
          }
        });
      }
      break;

    case 'partialAssistantMessage':
      if (config.sdk.verbose && message.delta) {
        process.stdout.write(message.delta);
      }
      break;

    case 'resultMessage':
      if (config.sdk.debug) {
        console.log(`${colors.yellow}🔧 Tool Result:${colors.reset}`);
        console.log(JSON.stringify(message.content, null, 2));
      }
      break;

    case 'userMessage':
      console.log(`${colors.green}You:${colors.reset} ${message.content}`);
      break;

    case 'permissionDenial':
      console.log(`${colors.red}⚠️  Permission Denied:${colors.reset} ${message.reason}`);
      break;

    default:
      if (config.sdk.debug) {
        console.log(`${colors.yellow}[${message.type}]${colors.reset}`, message);
      }
  }
}

/**
 * Process user query with Claude Agent SDK
 */
async function processQuery(userPrompt) {
  console.log(`\n${colors.blue}🔄 Processing query...${colors.reset}\n`);

  try {
    // Create query stream
    const queryStream = query({
      prompt: userPrompt,
      options: {
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        maxTokens: config.anthropic.maxTokens,
        permissionMode: config.sdk.permissionMode,
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

    // Stream and display messages
    for await (const message of queryStream) {
      formatMessage(message);
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

