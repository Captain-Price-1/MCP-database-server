/**
 * Configuration loader for Claude Agent Client
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Build MCP server arguments based on database type
 */
function buildServerArgs() {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  const args = [];

  switch (dbType) {
    case 'mysql':
      args.push('--mysql');
      if (process.env.DATABASE_HOST) args.push('--host', process.env.DATABASE_HOST);
      if (process.env.DATABASE_PORT) args.push('--port', process.env.DATABASE_PORT);
      if (process.env.DATABASE_NAME) args.push('--database', process.env.DATABASE_NAME);
      if (process.env.DATABASE_USER) args.push('--user', process.env.DATABASE_USER);
      if (process.env.DATABASE_PASSWORD) args.push('--password', process.env.DATABASE_PASSWORD);
      break;

    case 'postgresql':
      args.push('--postgresql');
      if (process.env.DATABASE_HOST) args.push('--host', process.env.DATABASE_HOST);
      if (process.env.DATABASE_PORT) args.push('--port', process.env.DATABASE_PORT);
      if (process.env.DATABASE_NAME) args.push('--database', process.env.DATABASE_NAME);
      if (process.env.DATABASE_USER) args.push('--user', process.env.DATABASE_USER);
      if (process.env.DATABASE_PASSWORD) args.push('--password', process.env.DATABASE_PASSWORD);
      break;

    case 'sqlserver':
      args.push('--sqlserver');
      if (process.env.DATABASE_SERVER) args.push('--server', process.env.DATABASE_SERVER);
      if (process.env.DATABASE_NAME) args.push('--database', process.env.DATABASE_NAME);
      if (process.env.DATABASE_USER) args.push('--user', process.env.DATABASE_USER);
      if (process.env.DATABASE_PASSWORD) args.push('--password', process.env.DATABASE_PASSWORD);
      break;

    case 'sqlite':
    default:
      // SQLite - database path is the first positional argument
      if (process.env.DATABASE_PATH) {
        args.push(process.env.DATABASE_PATH);
      } else {
        args.push(join(__dirname, '..', '..', 'data', 'test.db'));
      }
      break;
  }

  return args;
}

/**
 * Get full server path
 */
function getServerPath() {
  const serverPath = process.env.MCP_SERVER_PATH || '../dist/src/index.js';
  return join(__dirname, '..', serverPath);
}

/**
 * Map permission mode to SDK-compatible values
 * Valid SDK modes: 'acceptEdits', 'bypassPermissions', 'default', 'plan'
 */
function mapPermissionMode(mode) {
  const modeMap = {
    'normal': 'default',
    'fully-automatic': 'bypassPermissions',
    'restrictive': 'default'
  };
  
  return modeMap[mode] || mode;
}

/**
 * Configuration object
 */
export const config = {
  // Claude API
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 4096
  },

  // MCP Server
  mcp: {
    serverPath: getServerPath(),
    serverArgs: buildServerArgs(),
    type: process.env.DATABASE_TYPE || 'sqlite'
  },

  // Database
  database: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    name: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    path: process.env.DATABASE_PATH
  },

  // SDK Options
  sdk: {
    permissionMode: mapPermissionMode(process.env.PERMISSION_MODE || 'normal'),
    autoStart: process.env.AUTO_START !== 'false',
    debug: process.env.DEBUG === 'true',
    verbose: process.env.VERBOSE === 'true'
  }
};

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  if (!config.anthropic.apiKey || config.anthropic.apiKey === 'your_claude_api_key_here') {
    errors.push('ANTHROPIC_API_KEY is not set or is using placeholder value');
  }

  if (!config.mcp.serverPath) {
    errors.push('MCP_SERVER_PATH is not set');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return true;
}

/**
 * Display configuration (for debugging)
 */
export function displayConfig() {
  console.log('📋 Configuration:');
  console.log(`   Claude Model: ${config.anthropic.model}`);
  console.log(`   Database Type: ${config.database.type}`);
  console.log(`   MCP Server: ${config.mcp.serverPath}`);
  console.log(`   Permission Mode: ${config.sdk.permissionMode}`);
  
  if (config.database.type !== 'sqlite') {
    console.log(`   Database Host: ${config.database.host || 'N/A'}`);
    console.log(`   Database Name: ${config.database.name || 'N/A'}`);
  } else {
    console.log(`   Database Path: ${config.database.path || config.mcp.serverArgs[0]}`);
  }
  
  console.log('');
}

export default config;

