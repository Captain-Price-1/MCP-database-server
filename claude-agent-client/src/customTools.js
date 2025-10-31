#!/usr/bin/env node

/**
 * Custom MCP Server for Laravel Actions (SMS, Email)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'laravel-actions-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_sms',
        description: 'Queue SMS to be sent to users. Use this ONLY when user explicitly asks to send SMS or text messages. This queues the SMS for Laravel to execute.',
        inputSchema: {
          type: 'object',
          properties: {
            user_ids: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of user IDs to send SMS to',
            },
            message: {
              type: 'string',
              description: 'The SMS message content to send',
            },
            reason: {
              type: 'string',
              description: 'Brief reason for sending SMS',
            },
          },
          required: ['user_ids', 'message'],
        },
      },
      {
        name: 'send_email',
        description: 'Queue email to be sent to users. Use this ONLY when user explicitly asks to send email. This queues the email for Laravel to execute.',
        inputSchema: {
          type: 'object',
          properties: {
            user_ids: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of user IDs to send email to',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            message: {
              type: 'string',
              description: 'The email message content',
            },
            reason: {
              type: 'string',
              description: 'Brief reason for sending email',
            },
          },
          required: ['user_ids', 'subject', 'message'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'send_sms': {
      return {
        content: [
          {
            type: 'text',
            text: `SMS queued successfully for ${args.user_ids.length} users. Laravel will execute the actual sending.`,
          },
        ],
      };
    }

    case 'send_email': {
      return {
        content: [
          {
            type: 'text',
            text: `Email queued successfully for ${args.user_ids.length} users. Laravel will execute the actual sending.`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Laravel Actions MCP Server error:', error);
  process.exit(1);
});

