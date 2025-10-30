#!/usr/bin/env node

import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig } from './src/config.js';

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log(`${colors.yellow}🧪 Testing Claude Agent Client output...${colors.reset}\n`);

validateConfig();

const queryStream = query({
  prompt: 'How many tables are in the database?',
  options: {
    apiKey: config.anthropic.apiKey,
    model: config.anthropic.model,
    maxTokens: config.anthropic.maxTokens,
    permissionMode: 'bypassPermissions',
    autoStart: true,
    mcpServers: [{
      type: 'stdio',
      command: 'node',
      args: [config.mcp.serverPath, ...config.mcp.serverArgs]
    }]
  }
});

for await (const message of queryStream) {
  console.log(`\n${colors.green}[${message.type}]${colors.reset}`);
  
  // Show ALL properties of the message
  if (message.text) {
    console.log(`${colors.cyan}TEXT:${colors.reset} ${message.text}`);
  }
  if (message.content) {
    console.log(`${colors.cyan}CONTENT:${colors.reset}`, JSON.stringify(message.content, null, 2));
  }
  if (message.delta) {
    console.log(`${colors.cyan}DELTA:${colors.reset} ${message.delta}`);
  }
}

console.log(`\n${colors.green}✅ Test complete!${colors.reset}`);

