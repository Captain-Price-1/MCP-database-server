#!/usr/bin/env node

/**
 * Demo script for Claude Agent Client
 * Shows advanced capabilities and semantic understanding
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { config, validateConfig } from './config.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

async function runDemo(prompt, description) {
  console.log(`\n${colors.bright}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}📝 ${description}${colors.reset}`);
  console.log(`${colors.yellow}Query: "${prompt}"${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(70)}${colors.reset}\n`);

  try {
    const queryStream = query({
      prompt,
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
          } else if (block.type === 'thinking') {
            console.log(`${colors.magenta}💭 Thinking: ${block.thinking}${colors.reset}`);
          }
        });
      }
    }

    console.log(`\n${colors.green}✅ Demo complete!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
  }

  // Pause between demos
  await new Promise(resolve => setTimeout(resolve, 3000));
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🚀 Claude Agent Client - Comprehensive Demo          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validate configuration
  try {
    validateConfig();
    console.log(`${colors.green}✅ Configuration validated${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Configuration Error:${colors.reset}`, error.message);
    console.log(`${colors.yellow}💡 Please copy env.example to .env and configure your settings${colors.reset}`);
    process.exit(1);
  }

  const demos = [
    {
      prompt: 'Explore the database. Tell me what tables exist and what kind of data they contain.',
      description: 'Demo 1: Database Exploration'
    },
    {
      prompt: 'How many family bookings were made in 2023? A family booking is one with kids.',
      description: 'Demo 2: Semantic Understanding (Family Bookings)'
    },
    {
      prompt: 'Which service was most popular in October 2023? Show me the top 5.',
      description: 'Demo 3: Complex Query with Joins'
    },
    {
      prompt: 'Who are the top users by number of reservations? Include their names, not just IDs.',
      description: 'Demo 4: Aggregation with Human-Readable Results'
    },
    {
      prompt: 'What are the quiet times for reservations? When do we have the least activity?',
      description: 'Demo 5: Analytical Query (Time-based Analysis)'
    }
  ];

  console.log(`${colors.yellow}Running ${demos.length} demonstration queries...${colors.reset}\n`);
  console.log(`${colors.cyan}💡 Watch how Claude autonomously:${colors.reset}`);
  console.log(`   • Explores the database schema`);
  console.log(`   • Reasons about business concepts`);
  console.log(`   • Generates appropriate SQL`);
  console.log(`   • Joins tables for readable results`);
  console.log(`   • Provides context and explanations\n`);

  for (const demo of demos) {
    await runDemo(demo.prompt, demo.description);
  }

  console.log(`\n${colors.bright}${colors.green}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎉 Demo Complete! All capabilities demonstrated.     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error.message);
  process.exit(1);
});

