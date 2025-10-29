#!/usr/bin/env node

/**
 * Test script for Claude Agent Client
 * Tests basic connectivity and query execution
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig, displayConfig } from './config.js';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

async function runTest() {
  console.log(`${colors.cyan}🧪 Claude Agent Client - Test Suite${colors.reset}\n`);

  // Validate configuration
  try {
    validateConfig();
    displayConfig();
  } catch (error) {
    console.error(`${colors.red}❌ Configuration Error:${colors.reset}`, error.message);
    process.exit(1);
  }

  const tests = [
    {
      name: 'List Tables',
      prompt: 'How many tables are in the database? List them.'
    },
    {
      name: 'Simple Query',
      prompt: 'Show me the first 5 records from any table you find'
    },
    {
      name: 'Count Query',
      prompt: 'Pick a table and tell me how many records it has'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.yellow}TEST: ${test.name}${colors.reset}`);
    console.log(`${colors.cyan}Prompt: "${test.prompt}"${colors.reset}`);
    console.log('='.repeat(60));

    try {
      const queryStream = query({
        prompt: test.prompt,
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

      let responseText = '';
      for await (const message of queryStream) {
        if (message.type === 'assistantMessage' && message.content) {
          const content = Array.isArray(message.content) ? message.content : [message.content];
          content.forEach(block => {
            if (typeof block === 'string') {
              responseText += block + '\n';
            } else if (block.type === 'text') {
              responseText += block.text + '\n';
            }
          });
        }
      }

      console.log(`\n${colors.green}✅ Response:${colors.reset}`);
      console.log(responseText);
      console.log(`${colors.green}✅ Test passed!${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Test failed:${colors.reset}`, error.message);
      if (config.sdk.debug) {
        console.error(error.stack);
      }
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${colors.green}🎉 All tests completed!${colors.reset}\n`);
}

runTest().catch(error => {
  console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error.message);
  process.exit(1);
});

