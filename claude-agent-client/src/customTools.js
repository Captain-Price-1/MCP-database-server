#!/usr/bin/env node

/**
 * MCP Tool Definitions for Laravel Actions
 */

const sendSmsTool = {
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
  handler: async ({ user_ids, message }) => {
    return {
      actions: user_ids.map(userId => ({
        type: 'sms',
        userId,
        phone: null, // Will be populated by Laravel
        message
      })),
      message: `Successfully queued SMS messages to ${user_ids.length} users.`
    };
  }
};

const sendEmailTool = {
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
  handler: async ({ user_ids, subject, message }) => {
    return {
      actions: user_ids.map(userId => ({
        type: 'email',
        userId,
        email: null, // Will be populated by Laravel
        subject,
        message
      })),
      message: `Successfully queued Email messages to ${user_ids.length} users.`
    };
  }
};

// Export tools for ES modules
export const tools = [sendSmsTool, sendEmailTool];

export const handleCall = async (name, args) => {
  switch (name) {
    case 'send_sms':
      return await sendSmsTool.handler(args);
    case 'send_email':
      return await sendEmailTool.handler(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

export { sendSmsTool, sendEmailTool };