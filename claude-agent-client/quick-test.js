#!/usr/bin/env node

/**
 * Quick test to verify Claude Agent Client is working
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig, displayConfig } from './src/config.js';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

async function main() {
  console.log(`${colors.cyan}🧪 Quick Test - Claude Agent Client${colors.reset}\n`);

  // Validate
  try {
    validateConfig();
    displayConfig();
  } catch (error) {
    console.error(`${colors.red}❌ ${error.message}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.yellow}🔄 Running query: "List all tables in the database"${colors.reset}\n`);

  try {
    const queryStream = query({
      prompt: 'List all tables in the database',
      options: {
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        maxTokens: config.anthropic.maxTokens,
        permissionMode: 'bypassPermissions',
        autoStart: true,
        mcpServers: [
          {
            type: 'stdio',
            command: 'node',
            args: [config.mcp.serverPath, ...config.mcp.serverArgs]
          }
        ]
      }
    });

    for await (const message of queryStream) {
      if (message.type === 'assistantMessage' && message.content) {
        const content = Array.isArray(message.content) ? message.content : [message.content];
        content.forEach(block => {
          if (typeof block === 'string') {
            console.log(`${colors.green}${block}${colors.reset}`);
          } else if (block.type === 'text') {
            console.log(`${colors.green}${block.text}${colors.reset}`);
          }
        });
      }
    }

    console.log(`\n${colors.green}✅ Test passed! Claude Agent Client is working.${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

