# Complete Architecture Guide: Claude Agent + MCP Database + Chart Integration

**A comprehensive guide explaining how everything works together**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Key Components](#key-components)
4. [How MCP Protocol Works](#how-mcp-protocol-works)
5. [The Flow: From Laravel to Chart](#the-flow-from-laravel-to-chart)
6. [Code Walkthrough](#code-walkthrough)
7. [What We Built Step-by-Step](#what-we-built-step-by-step)
8. [Why It Works This Way](#why-it-works-this-way)
9. [Troubleshooting Deep Dive](#troubleshooting-deep-dive)

---

## Overview

### What Is This System?

This is a **multi-layered AI system** that lets you:
1. **Query databases** using natural language (no SQL needed)
2. **Generate charts** automatically from query results
3. **Integrate with Laravel** (or any app) via REST API

### The Three Main Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Your Laravel Application                     │
│  (Frontend/Backend - sends natural language requests)  │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP POST /query
                 ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Claude Agent API Server (api.js)             │
│  (Express server - orchestrates everything)            │
└────────────────┬────────────────────────────────────────┘
                 │ Spawns & manages
                 ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Claude Agent SDK (@anthropic-ai/claude-agent-sdk) │
│  (AI orchestration - connects to Claude & MCP servers) │
└────────────────┬────────────────────────────────────────┘
                 │ STDIO connections
                 ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4a: Database MCP Server                         │
│  (@executeautomation/database-server)                  │
│  Tools: list_tables, read_query, describe_table, etc. │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Layer 4b: Chart MCP Server                            │
│  (@antv/mcp-server-chart)                              │
│  Tools: generate_bar_chart, generate_line_chart, etc.  │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### The Complete Flow

```
┌──────────────┐
│   Laravel    │ "Show me top 5 barbers with a chart"
│     App      │─────────────────────┐
└──────────────┘                     │
                                     │ HTTP POST
                                     ↓
                          ┌──────────────────────┐
                          │  Express API Server  │
                          │     (api.js)         │
                          │  Port: 3000          │
                          └──────────┬───────────┘
                                     │ Spawns process
                                     ↓
                          ┌──────────────────────┐
                          │  Claude Agent SDK    │
                          │  Process             │
                          └──────────┬───────────┘
                                     │
                     ┌───────────────┴────────────────┐
                     │                                │
                     ↓ STDIO                          ↓ STDIO
          ┌──────────────────┐            ┌──────────────────┐
          │  Database MCP    │            │   Chart MCP      │
          │     Server       │            │    Server        │
          │  (Node process)  │            │  (npx process)   │
          └────────┬─────────┘            └────────┬─────────┘
                   │                                │
                   ↓                                ↓
          ┌──────────────────┐            ┌──────────────────┐
          │   Your MySQL     │            │  AntV Chart      │
          │   Database       │            │   Service        │
          │   (laravel)      │            │  (CDN hosted)    │
          └──────────────────┘            └──────────────────┘
                   │                                │
                   │ Returns data                   │ Returns URL
                   └────────────┬───────────────────┘
                                ↓
                          Response flows back
                          through all layers
                                ↓
                          ┌──────────────────────┐
                          │   JSON Response      │
                          │  {                   │
                          │    response: "...",  │
                          │    charts: [urls]    │
                          │  }                   │
                          └──────────────────────┘
```

---

## Key Components

### 1. MCP (Model Context Protocol)

**What is MCP?**
- A **protocol** created by Anthropic for connecting AI models to external tools
- Like USB for AI - standardized way to connect tools
- Uses **STDIO** (standard input/output) for communication

**Why MCP?**
- Claude can call tools without us writing custom code for each tool
- Tools are discovered automatically
- Secure sandboxed execution

### 2. MCP Server (ExecuteAutomation Database Server)

**Location:** `@executeautomation/database-server` (or your local `dist/src/index.js`)

**What it does:**
- Exposes database operations as **tools** Claude can call
- Handles MySQL, PostgreSQL, SQLite, SQL Server

**Available Tools:**
- `list_tables` - List all tables in database
- `describe_table` - Get columns and schema of a table
- `read_query` - Execute SELECT queries (read-only)
- `write_query` - Execute INSERT/UPDATE/DELETE
- `export_query_results` - Export to CSV/JSON

**How it works:**
```javascript
// When Claude calls list_tables
Claude: "Call list_tables tool"
  ↓
MCP Server receives: { tool: "list_tables" }
  ↓
Server runs: SELECT table_name FROM information_schema.tables
  ↓
Returns: { tables: ["users", "orders", "products"] }
  ↓
Claude receives the result
```

### 3. Chart MCP Server (@antv/mcp-server-chart)

**Location:** `@antv/mcp-server-chart` (downloaded via npx)

**What it does:**
- Generates professional charts from data
- Uses AntV visualization library
- Hosts charts on CDN, returns URLs

**Available Tools (25+):**
- `generate_bar_chart` - Bar/column charts
- `generate_line_chart` - Line charts
- `generate_pie_chart` - Pie charts
- `generate_scatter_chart` - Scatter plots
- `generate_heatmap` - Heatmaps
- ...and 20 more chart types

**How it works:**
```javascript
// When Claude calls generate_bar_chart
Claude: "Call generate_bar_chart with data"
  ↓
Chart Server receives: {
  tool: "generate_bar_chart",
  data: [
    { category: "Barber 1", value: 44 },
    { category: "Barber 2", value: 19 }
  ]
}
  ↓
Server generates chart using AntV
  ↓
Uploads to CDN (mdn.alipayobjects.com)
  ↓
Returns: { url: "https://mdn.alipayobjects.com/..." }
  ↓
Claude receives the URL
```

### 4. Claude Agent SDK

**Location:** `@anthropic-ai/claude-agent-sdk`

**What it does:**
- **Orchestrates** the entire AI workflow
- Spawns and manages MCP server processes
- Handles communication between Claude API and MCP servers
- Manages conversation state and tool calling

**Key Features:**
- Automatically discovers tools from MCP servers
- Handles multi-turn conversations
- Manages permissions
- Streams responses

### 5. Our Express API Server (api.js)

**What we built:**
- REST API wrapper around Claude Agent SDK
- Makes it easy for Laravel (or any app) to use the system
- Handles sessions and conversation history
- Extracts chart URLs from responses

---

## How MCP Protocol Works

### STDIO Communication

MCP uses **STDIO** (Standard Input/Output) - like command-line pipes:

```bash
# Similar to how Unix pipes work:
echo "data" | program | another_program

# MCP does this:
Claude Agent SDK → writes to STDIN → MCP Server
MCP Server → writes to STDOUT → Claude Agent SDK
```

### Message Format

Messages are JSON-RPC 2.0:

```json
// Claude requesting a tool
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_query",
    "arguments": {
      "query": "SELECT * FROM users LIMIT 10"
    }
  }
}

// MCP Server responding
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":1,\"name\":\"John\"}...]"
      }
    ]
  }
}
```

### Tool Discovery

When an MCP server starts:

1. **Handshake** - SDK connects to server via STDIO
2. **Capability exchange** - Server tells SDK what tools it has
3. **Tool list request** - SDK asks for list of available tools
4. **Tool descriptions** - Server sends detailed tool schemas

Example tool schema:
```json
{
  "name": "read_query",
  "description": "Execute a SELECT query on the database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The SQL SELECT query to execute"
      }
    },
    "required": ["query"]
  }
}
```

Claude sees this and knows how to call the tool!

---

## The Flow: From Laravel to Chart

### Complete Request Flow

Let's trace a request: **"Show me top 5 barbers and create a chart"**

#### Step 1: Laravel Sends Request

```php
// In Laravel controller
Http::post('http://localhost:3000/query', [
    'prompt' => 'Show me top 5 barbers and create a chart'
]);
```

**What happens:**
- HTTP POST to Express API server
- Body contains the natural language prompt

---

#### Step 2: Express API Receives Request

```javascript
// api.js - /query endpoint
app.post('/query', async (req, res) => {
  const { prompt } = req.body;
  
  // Get or create session for conversation history
  const session = getSession(sessionId);
  
  // Process the query
  const result = await processQuery(prompt, session);
  
  res.json(result);
});
```

**What happens:**
- API receives the prompt
- Creates/retrieves a session (for conversation memory)
- Calls `processQuery()`

---

#### Step 3: Spawn Claude Agent SDK Process

```javascript
// api.js - processQuery function
const queryStream = query({
  prompt: userPrompt,
  conversationHistory: session.history,
  options: {
    apiKey: config.anthropic.apiKey,
    model: 'claude-sonnet-4',
    mcpServers: [
      // Database MCP Server
      {
        type: 'stdio',
        command: 'node',
        args: ['../dist/src/index.js', '--mysql', '--host', '127.0.0.1', ...],
        env: { NODE_ENV: 'production' }
      },
      // Chart MCP Server
      {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@antv/mcp-server-chart'],
        env: { NODE_ENV: 'production' }
      }
    ]
  }
});
```

**What happens:**
- SDK spawns TWO child processes via Node.js `child_process`:
  1. Database MCP server process
  2. Chart MCP server process (via npx)
- Each process starts and connects via STDIO pipes
- SDK performs handshake with each server
- SDK receives list of available tools from both servers

**At this point:**
- Claude knows about database tools: `list_tables`, `read_query`, etc.
- Claude knows about chart tools: `generate_bar_chart`, etc.

---

#### Step 4: Claude Analyzes the Prompt

```
User prompt: "Show me top 5 barbers and create a chart"

Claude thinks:
1. I need to query a database
2. I should get top 5 barbers (probably by some metric)
3. I need to create a chart from that data
4. Let me start by exploring the database schema
```

---

#### Step 5: Claude Calls Database Tools

**Turn 1: List tables**
```javascript
Claude → SDK: Call tool "list_tables"
SDK → Database MCP: { method: "tools/call", params: { name: "list_tables" } }
Database MCP → MySQL: SHOW TABLES
MySQL → Database MCP: [users, barbers, reservations, ...]
Database MCP → SDK: { result: { tables: [...] } }
SDK → Claude: Here are the tables: users, barbers, reservations, ...
```

**Turn 2: Describe barbers table**
```javascript
Claude → SDK: Call tool "describe_table" with table: "barbers"
SDK → Database MCP: { method: "tools/call", params: { name: "describe_table", table: "barbers" } }
Database MCP → MySQL: DESCRIBE barbers
MySQL → Database MCP: [id, name, rating, services, ...]
Database MCP → SDK: { result: { columns: [...] } }
SDK → Claude: The barbers table has: id, name, rating, services columns
```

**Turn 3: Query top 5 barbers**
```javascript
Claude → SDK: Call tool "read_query" with query: "SELECT name, rating FROM barbers ORDER BY rating DESC LIMIT 5"
SDK → Database MCP: { method: "tools/call", params: { name: "read_query", query: "..." } }
Database MCP → MySQL: SELECT name, rating FROM barbers ORDER BY rating DESC LIMIT 5
MySQL → Database MCP: [
  {name: "Ronald", rating: 5},
  {name: "Fred", rating: 5},
  ...
]
Database MCP → SDK: { result: { rows: [...] } }
SDK → Claude: Here's the data: [...]
```

---

#### Step 6: Claude Calls Chart Tool

Now Claude has the data and wants to create a chart:

```javascript
Claude → SDK: Call tool "generate_bar_chart" with data: [
  { category: "Ronald", value: 5 },
  { category: "Fred", value: 5 },
  ...
]

SDK → Chart MCP: {
  method: "tools/call",
  params: {
    name: "generate_bar_chart",
    arguments: {
      title: "Top 5 Barbers by Rating",
      data: [...]
    }
  }
}

Chart MCP: 
  1. Receives the data
  2. Generates chart using AntV library
  3. Renders to image
  4. Uploads to CDN (mdn.alipayobjects.com)
  5. Gets back URL

Chart MCP → SDK: {
  result: {
    success: true,
    resultObj: "https://mdn.alipayobjects.com/one_clip/afts/img/xxxxx/original"
  }
}

SDK → Claude: Chart created at URL: https://...
```

---

#### Step 7: Claude Formats Response

```javascript
Claude composes final response:
"Here are the top 5 barbers:
1. Ronald - Rating: 5
2. Fred - Rating: 5
...

![Chart](https://mdn.alipayobjects.com/one_clip/afts/img/xxxxx/original)"
```

---

#### Step 8: SDK Streams Messages to API

```javascript
// api.js receives messages from SDK
for await (const message of queryStream) {
  // Message types:
  // - assistantMessage (Claude thinking)
  // - tool_use (Claude calling a tool)
  // - tool_result (Tool response)
  // - result (Final answer)
  
  if (message.type === 'result') {
    assistantResponse += message.result;
  }
  
  // Extract chart URLs from messages
  if (message.content) {
    // Look for tool results with URLs
    // Look for URLs in text
  }
}
```

---

#### Step 9: API Extracts Chart URLs

This is where we had issues! The chart URL is somewhere in the message stream, and we need to extract it:

```javascript
// Method 1: From tool_result blocks
if (block.type === 'tool_result') {
  const content = JSON.parse(block.content);
  if (content.resultObj && content.resultObj.includes('http')) {
    chartUrls.push(content.resultObj);
  }
}

// Method 2: From response text (markdown images)
const markdownRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
while ((match = markdownRegex.exec(assistantResponse)) !== null) {
  chartUrls.push(match[1]);
}

// Method 3: Deep search through ALL messages
for (const msg of allMessages) {
  const msgStr = JSON.stringify(msg);
  const urlRegex = /(https?:\/\/(?:mdn\.alipayobjects\.com)[^\s"'\)]+)/g;
  // Extract any chart URLs
}
```

---

#### Step 10: API Returns Response to Laravel

```javascript
// api.js sends final response
res.json({
  success: true,
  response: "Here are the top 5 barbers...",
  charts: [
    "https://mdn.alipayobjects.com/one_clip/afts/img/xxxxx/original"
  ],
  metadata: {
    toolsUsed: ["list_tables", "describe_table", "read_query", "generate_bar_chart"],
    cost: 0.042,
    turns: 7,
    sessionId: "session_abc123"
  }
});
```

---

#### Step 11: Laravel Displays Result

```php
// Laravel receives response
$result = $response->json();

if ($result['success']) {
    echo $result['response'];  // Text answer
    
    foreach ($result['charts'] as $chartUrl) {
        echo "<img src='$chartUrl' alt='Chart' />";
    }
}
```

---

## Code Walkthrough

### File 1: api.js (Express Server)

**Purpose:** REST API that wraps the Claude Agent SDK

#### Key Functions:

**getSession(sessionId)**
```javascript
function getSession(sessionId) {
  // Creates or retrieves a conversation session
  // Sessions store conversation history for context
  // Auto-expires after 1 hour of inactivity
}
```

**processQuery(userPrompt, session)**
```javascript
async function processQuery(userPrompt, session) {
  // 1. Add user message to session history
  session.history.push({ role: 'user', content: userPrompt });
  
  // 2. Create Claude Agent SDK query with MCP servers
  const queryStream = query({
    prompt: userPrompt,
    conversationHistory: session.history,
    options: {
      mcpServers: [/* database server, chart server */]
    }
  });
  
  // 3. Stream through messages
  for await (const message of queryStream) {
    // Collect assistant response
    // Track tools used
    // Extract chart URLs
  }
  
  // 4. Return structured result
  return {
    success: true,
    response: assistantResponse,
    charts: chartUrls,
    metadata: { cost, turns, sessionId }
  };
}
```

**Chart URL Extraction Logic**
```javascript
// Problem: Chart URLs can appear in multiple places in the message stream
// Solution: Multiple extraction methods

// Method 1: From tool_result content
if (block.type === 'tool_result') {
  let toolContent = block.content;
  // Parse and extract resultObj field
}

// Method 2: From final response text (markdown images)
const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
// Extracts: ![alt](https://url.com/image.png)

// Method 3: Deep search through all messages
for (const msg of allMessages) {
  const msgStr = JSON.stringify(msg);
  // Search for any URL from chart domains
}
```

**Why multiple methods?**
- The Claude Agent SDK streams messages in real-time
- Chart URLs can be in different message formats
- Sometimes in tool results, sometimes in final text
- Deep search is a fallback to catch anything we missed

---

### File 2: config.js (Configuration)

**Purpose:** Load and validate configuration from .env file

```javascript
export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4',
    maxTokens: 4096
  },
  mcp: {
    serverPath: '../dist/src/index.js',  // Database MCP server
    serverArgs: ['--mysql', '--host', '127.0.0.1', ...],
    type: 'mysql'
  },
  database: {
    type: 'mysql',
    host: '127.0.0.1',
    name: 'laravel',
    user: 'root',
    password: 'root'
  }
};
```

**buildServerArgs()**
- Converts database config to command-line arguments
- Different for each database type (MySQL, PostgreSQL, SQLite)

---

### File 3: index.js (CLI Client)

**Purpose:** Interactive command-line interface (original implementation)

This is what we started with - a terminal-based client where you type questions and see answers. We kept this and added the API on top of it.

---

## What We Built Step-by-Step

### Phase 1: Chart MCP Integration (CLI)

**Goal:** Add chart generation to the CLI client

**What we did:**
1. Modified `index.js` to connect to TWO MCP servers instead of one
2. Added chart server to `mcpServers` array
3. Updated help text with chart examples

**Code:**
```javascript
mcpServers: [
  { /* database server */ },
  { /* chart server */ }  // ← Added this
]
```

**Result:** CLI could now generate charts when asked

---

### Phase 2: REST API Server (api.js)

**Goal:** Make it accessible from Laravel via HTTP

**What we did:**
1. Created `api.js` - Express server
2. Implemented `/query` endpoint
3. Added session management for conversation history
4. Extracted chart URLs from responses

**Why?**
- Laravel can't directly use the CLI
- Need HTTP REST API
- Need to maintain conversation state per user

---

### Phase 3: Chart URL Extraction (The Hard Part)

**Problem:** Chart URLs weren't showing up in the `charts` array

**Why it was hard:**
- The Claude Agent SDK streams messages in a complex format
- Chart URLs appeared in different places depending on timing
- Sometimes in `tool_result` blocks
- Sometimes only in the final text response
- Message structure was nested and complex

**Solutions we tried:**

**Attempt 1:** Extract from `tool_result` content
```javascript
if (block.type === 'tool_result' && block.content) {
  const content = JSON.parse(block.content);
  if (content.resultObj) chartUrls.push(content.resultObj);
}
```
**Result:** Didn't work - URL wasn't in that field

**Attempt 2:** Extract from markdown images in response
```javascript
const regex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
while ((match = regex.exec(assistantResponse)) !== null) {
  chartUrls.push(match[1]);
}
```
**Result:** Sometimes worked, but inconsistent

**Attempt 3:** Deep search through ALL messages
```javascript
for (const msg of allMessages) {
  const msgStr = JSON.stringify(msg);
  const urlRegex = /(https?:\/\/mdn\.alipayobjects\.com[^\s"'\)]+)/g;
  // Find any chart URL anywhere in any message
}
```
**Result:** This works! Aggressive but catches everything

---

### Phase 4: Debugging Tools

**Added:**
1. Debug mode with `DEBUG=true` in .env
2. Console logging at every extraction point
3. Save all messages to file for inspection
4. `/tools` endpoint to verify MCP servers are connected

---

## Why It Works This Way

### Why STDIO for MCP?

**Benefits:**
- **Sandboxed:** MCP server runs in separate process
- **Language agnostic:** Any language that can spawn processes works
- **Simple:** Just stdin/stdout pipes, no complex networking
- **Secure:** No network ports to secure, no HTTP vulnerabilities

### Why Two Separate MCP Servers?

**Could we combine database + charts into one server?**

Yes, but **separation of concerns** is better:

1. **Database server** (ExecuteAutomation) - Stable, focused on data access
2. **Chart server** (AntV) - Specialized for visualization

**Benefits:**
- Each server is simpler and more reliable
- Can update independently
- Can swap out chart server for different provider
- Can use database server without charts

### Why Express API Wrapper?

**Why not use Claude Agent SDK directly from Laravel?**

**Could we do this?**
```php
// In Laravel
use AnthropicAI\ClaudeAgentSDK\Query;

$result = Query::execute('Show me barbers');
```

**Problems:**
1. **Language barrier:** SDK is Node.js, Laravel is PHP
2. **Process management:** SDK spawns child processes - hard from PHP
3. **Session management:** Need to track conversations per user
4. **Error handling:** Better to centralize in API
5. **Deployment:** One Node process vs managing per PHP request

**Solution: API Server**
- Laravel makes HTTP requests (easy!)
- Node.js handles the complex SDK stuff
- API manages sessions and processes
- Clean separation of concerns

### Why Session Management?

**Without sessions:**
```
User: "Show me barbers"
AI: "Here are the barbers: Ronald, Fred..."

User: "What about the second one?"
AI: "I don't know what you're referring to"  ❌
```

**With sessions:**
```
User: "Show me barbers"
AI: "Here are the barbers: Ronald, Fred..."  [Stores conversation]

User: "What about the second one?"
AI: "Fred has 5 stars and works Mon-Fri"  ✅  [Remembers context]
```

**How sessions work:**
```javascript
// Session structure
{
  id: "session_abc123",
  history: [
    { role: "user", content: "Show me barbers" },
    { role: "assistant", content: "Here are the barbers..." },
    { role: "user", content: "What about the second one?" },
    { role: "assistant", content: "Fred has..." }
  ],
  createdAt: "2025-01-01T10:00:00Z",
  lastActivity: "2025-01-01T10:05:00Z"
}
```

Each request includes conversation history, so Claude has context!

---

## Troubleshooting Deep Dive

### Issue 1: "Chart URLs not appearing in charts array"

**Root cause:** Chart URLs were in the message stream but extraction code wasn't finding them

**Why it happened:**
1. Claude Agent SDK returns streaming messages
2. Messages have complex nested structure
3. Chart URL location varies:
   - Sometimes in `tool_result` → `content` → `resultObj`
   - Sometimes in final text as markdown image
   - Sometimes only visible when JSON stringifying all messages

**Solution:** Multiple extraction methods (explained above)

---

### Issue 2: "toolsUsed array is empty"

**Root cause:** Chart tool wasn't being called at all

**Why it happened:**
- Prompt wasn't explicit enough
- Claude thought it could just describe a chart instead of generating one

**Solution:** Be explicit in prompts:
- ❌ "Show me a chart"
- ✅ "Generate a bar chart using the chart tool"
- ✅ "Create a chart with the chart generation tool"

---

### Issue 3: "MCP server connection failed"

**Possible causes:**
1. **Server path wrong:** Check `MCP_SERVER_PATH` in .env
2. **Database credentials wrong:** Check `DATABASE_*` in .env
3. **npm package not installed:** Run `npm install`
4. **Port conflict:** Database port already in use

**How to debug:**
1. Enable `DEBUG=true` in .env
2. Watch terminal for connection messages
3. Check `/tools` endpoint to see available tools
4. Look for `[ERROR]` lines in terminal

---

### Issue 4: "Session not persisting"

**Causes:**
1. Not sending `sessionId` in subsequent requests
2. Session expired (1 hour timeout)
3. Server restarted (sessions are in-memory)

**Solution:**
```javascript
// First request
POST /query { prompt: "Show barbers" }
Response: { ..., metadata: { sessionId: "abc123" } }

// Follow-up request - include sessionId
POST /query {
  prompt: "What about the second one?",
  sessionId: "abc123"  // ← Include this!
}
```

---

## Summary

### What We Built

1. **Express API Server** (`api.js`)
   - REST API for Laravel integration
   - Session management
   - Chart URL extraction
   - Error handling

2. **Chart Integration**
   - Connected chart MCP server alongside database server
   - Multiple extraction methods for chart URLs
   - Fallback mechanisms

3. **Debug Tools**
   - Comprehensive logging
   - Message inspection
   - Tools availability checking

### The Magic Triangle

```
     Claude (AI Brain)
           ↓
    Agent SDK (Orchestrator)
           ↓
    ┌──────┴──────┐
    ↓             ↓
Database MCP  Chart MCP
    ↓             ↓
  Your DB    Chart CDN
```

### Key Takeaways

1. **MCP is the connection protocol** - Standardized way for AI to use tools
2. **Agent SDK is the orchestrator** - Manages everything
3. **API server is the interface** - Makes it accessible from Laravel
4. **Sessions enable conversations** - Context across multiple requests
5. **Multiple extraction methods** - Robustness for chart URLs

---

## Quick Reference

### Start the API
```bash
cd claude-agent-client
npm run api
```

### Make a request
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show top 5 barbers and create a chart"}'
```

### Enable debugging
```bash
# In .env
DEBUG=true
```

### Check if MCP servers are connected
```bash
curl http://localhost:3000/tools
```

---

**That's the complete architecture! Every layer, every decision, explained. 🚀**

