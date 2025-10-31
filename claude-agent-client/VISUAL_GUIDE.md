# Visual Quick Reference Guide

Quick visual diagrams to understand the system at a glance.

---

## 🎯 System Overview (30,000 ft view)

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR LARAVEL APP                        │
│                                                              │
│  User: "Show me top 5 barbers and create a chart"          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ { prompt: "..." }
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS API SERVER (api.js)                     │
│              Running on http://localhost:3000                │
│                                                              │
│  → Manages sessions                                         │
│  → Extracts chart URLs                                      │
│  → Returns JSON                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Spawns & Manages
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            CLAUDE AGENT SDK (Node.js Process)               │
│                                                              │
│  → Connects to Claude API                                   │
│  → Spawns MCP servers                                       │
│  → Orchestrates tool calling                                │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
             │ STDIO                        │ STDIO
             ↓                              ↓
┌──────────────────────┐     ┌────────────────────────────────┐
│  DATABASE MCP SERVER │     │    CHART MCP SERVER            │
│  (Node process)      │     │    (npx process)               │
│                      │     │                                │
│  Tools:              │     │  Tools:                        │
│  • list_tables       │     │  • generate_bar_chart          │
│  • describe_table    │     │  • generate_line_chart         │
│  • read_query        │     │  • generate_pie_chart          │
│  • write_query       │     │  • 22 more chart types         │
└──────────┬───────────┘     └──────────┬─────────────────────┘
           │                            │
           ↓                            ↓
    ┌─────────────┐            ┌───────────────────┐
    │  YOUR DB    │            │  ANTV CHART CDN   │
    │  (MySQL)    │            │  (Cloud hosted)   │
    └─────────────┘            └───────────────────┘
```

---

## 🔄 Request Flow (What happens when you send a query)

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Laravel sends HTTP POST                              │
│                                                               │
│   POST http://localhost:3000/query                           │
│   { "prompt": "Show top 5 barbers with chart" }             │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: API Server receives & creates session                │
│                                                               │
│   session = getSession(sessionId)                            │
│   session.history = [previous messages...]                   │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Spawn Claude Agent SDK                               │
│                                                               │
│   Spawns TWO child processes:                                │
│   → Database MCP Server (connects to your DB)               │
│   → Chart MCP Server (connects to AntV)                     │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Claude analyzes prompt                               │
│                                                               │
│   "I need to:                                                │
│    1. Query the database for barbers                        │
│    2. Get top 5                                             │
│    3. Create a chart                                        │
│   Let me start by exploring the schema..."                  │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Claude calls database tools (multiple turns)         │
│                                                               │
│   Turn 1: list_tables                                        │
│   → Returns: [users, barbers, reservations, ...]            │
│                                                               │
│   Turn 2: describe_table("barbers")                          │
│   → Returns: [id, name, rating, services, ...]              │
│                                                               │
│   Turn 3: read_query("SELECT ... ORDER BY ... LIMIT 5")     │
│   → Returns: [{name: "Ronald", rating: 5}, ...]             │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 6: Claude calls chart tool                              │
│                                                               │
│   generate_bar_chart({                                       │
│     title: "Top 5 Barbers",                                 │
│     data: [                                                  │
│       {category: "Ronald", value: 5},                       │
│       {category: "Fred", value: 5},                         │
│       ...                                                    │
│     ]                                                        │
│   })                                                         │
│                                                               │
│   → Chart server generates PNG                              │
│   → Uploads to CDN                                          │
│   → Returns: "https://mdn.alipayobjects.com/..."           │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 7: Claude composes response                             │
│                                                               │
│   "Here are the top 5 barbers:                              │
│    1. Ronald - 5 stars                                      │
│    2. Fred - 5 stars                                        │
│    ...                                                       │
│                                                               │
│    ![Chart](https://mdn.alipayobjects.com/...)"            │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 8: API extracts chart URLs                              │
│                                                               │
│   chartUrls = []                                             │
│                                                               │
│   Method 1: Check tool_result blocks                        │
│   Method 2: Extract from markdown images                    │
│   Method 3: Deep search all messages                        │
│                                                               │
│   → Found: ["https://mdn.alipayobjects.com/..."]           │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 9: API returns JSON to Laravel                          │
│                                                               │
│   {                                                          │
│     "success": true,                                         │
│     "response": "Here are the top 5 barbers...",            │
│     "charts": ["https://mdn.alipayobjects.com/..."],       │
│     "metadata": {                                            │
│       "cost": 0.042,                                         │
│       "turns": 7,                                            │
│       "sessionId": "session_abc123"                         │
│     }                                                        │
│   }                                                          │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 10: Laravel displays to user                            │
│                                                               │
│   echo $result['response'];                                  │
│   echo "<img src='" . $result['charts'][0] . "' />";       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
claude-agent-client/
│
├── src/
│   ├── api.js           ← Express REST API server (what you use from Laravel)
│   ├── index.js         ← CLI interactive client (terminal version)
│   └── config.js        ← Configuration loader (.env → config object)
│
├── .env                 ← Your configuration (API keys, DB credentials)
├── package.json         ← Dependencies & scripts
│
├── ARCHITECTURE_GUIDE.md    ← Complete system explanation (read this!)
├── API_README.md            ← API quick reference
├── LARAVEL_API_GUIDE.md     ← Laravel integration guide
├── QUICK_START.md           ← CLI client guide
└── README.md                ← Main overview
```

---

## 🔌 API Endpoints

```
┌────────────────────────────────────────────────────────────┐
│                     API ENDPOINTS                          │
└────────────────────────────────────────────────────────────┘

GET /health
├─ Purpose: Check if API is running
├─ Auth: None
└─ Response: { "status": "ok", "activeSessions": 3 }

POST /query
├─ Purpose: Process a natural language query
├─ Auth: None (add your own if needed)
├─ Body: {
│    "prompt": "Your question here",
│    "sessionId": "optional-for-context",
│    "newSession": false
│  }
└─ Response: {
     "success": true,
     "response": "Text answer",
     "charts": ["url1", "url2"],
     "metadata": {
       "toolsUsed": ["read_query", "generate_bar_chart"],
       "cost": 0.042,
       "turns": 7,
       "sessionId": "session_abc123"
     }
   }

POST /session/clear
├─ Purpose: Clear conversation history
├─ Body: { "sessionId": "session_abc123" }
└─ Response: { "success": true }

GET /session/:sessionId
├─ Purpose: Get session information
└─ Response: {
     "id": "session_abc123",
     "messageCount": 10,
     "createdAt": "...",
     "lastActivity": "..."
   }

GET /tools
├─ Purpose: List available MCP tools (debugging)
└─ Response: { "response": "Available tools: ..." }
```

---

## 🔑 Configuration (.env file)

```
┌────────────────────────────────────────────────────────────┐
│                  CONFIGURATION SECTIONS                    │
└────────────────────────────────────────────────────────────┘

[Claude API]
ANTHROPIC_API_KEY=sk-ant-xxx...   ← Get from console.anthropic.com

[Database - MySQL Example]
DATABASE_TYPE=mysql                ← mysql | postgresql | sqlite | sqlserver
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=laravel
DATABASE_USER=root
DATABASE_PASSWORD=root

[MCP Server]
MCP_SERVER_PATH=../dist/src/index.js   ← Path to compiled MCP server

[Claude Model]
CLAUDE_MODEL=claude-sonnet-4-20250514  ← Which Claude model to use
MAX_TOKENS=4096                         ← Max response length

[API Server]
API_PORT=3000                      ← Port for Express API

[Debug]
DEBUG=false                        ← Set to true for detailed logs
```

---

## 🧩 Key Concepts

### What is MCP (Model Context Protocol)?

```
┌─────────────────────────────────────────────────────────────┐
│  MCP is like USB for AI                                     │
│                                                              │
│  Just like USB lets you plug any device into any computer: │
│                                                              │
│  USB: Computer ←→ Keyboard, Mouse, Printer                 │
│  MCP: AI Model ←→ Database, Charts, APIs, Files            │
│                                                              │
│  Benefits:                                                   │
│  ✓ Standardized protocol                                   │
│  ✓ Sandboxed & secure                                      │
│  ✓ Language agnostic                                       │
│  ✓ Tools are auto-discovered                               │
└─────────────────────────────────────────────────────────────┘
```

### What is STDIO?

```
┌─────────────────────────────────────────────────────────────┐
│  STDIO = Standard Input/Output                              │
│                                                              │
│  Like pipes in Unix:                                        │
│  echo "hello" | program | another_program                   │
│                                                              │
│  MCP uses this:                                             │
│  Claude Agent ──→ stdin ──→ MCP Server                      │
│  MCP Server ──→ stdout ──→ Claude Agent                     │
│                                                              │
│  Why?                                                        │
│  ✓ Simple - just text in/out                               │
│  ✓ Secure - sandboxed process                              │
│  ✓ No network ports needed                                 │
└─────────────────────────────────────────────────────────────┘
```

### What are Sessions?

```
┌─────────────────────────────────────────────────────────────┐
│  Sessions = Conversation Memory                             │
│                                                              │
│  Without sessions:                                          │
│  User: "Show barbers"                                       │
│  AI: "Ronald, Fred, ..."                                    │
│  User: "Tell me about the second one"                       │
│  AI: "What second one?" ❌                                   │
│                                                              │
│  With sessions:                                             │
│  User: "Show barbers" [creates session_abc]                │
│  AI: "Ronald, Fred, ..." [saves to session_abc]            │
│  User: "Tell me about the second one" [uses session_abc]   │
│  AI: "Fred works Mon-Fri and..." ✅                          │
│                                                              │
│  How it works:                                              │
│  session_abc = {                                            │
│    history: [                                               │
│      {role: "user", content: "Show barbers"},              │
│      {role: "assistant", content: "Ronald, Fred..."},      │
│      {role: "user", content: "Tell me about second"}       │
│    ]                                                        │
│  }                                                          │
│                                                              │
│  Each new request includes full history → Claude has context│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start API server (for Laravel)
npm run api

# Start CLI client (interactive terminal)
npm start

# Test API is running
curl http://localhost:3000/health

# Make a query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me all tables"}'

# Enable debug mode
# Edit .env and set: DEBUG=true
```

---

## 🐛 Common Issues & Fixes

```
┌─────────────────────────────────────────────────────────────┐
│ Issue: "Charts array is empty"                              │
├─────────────────────────────────────────────────────────────┤
│ Cause: Chart URL not being extracted from response         │
│ Fix: ✓ Enable DEBUG=true in .env                           │
│      ✓ Check terminal for chart URL                        │
│      ✓ Restart API server with latest code                 │
│      ✓ Be explicit: "generate chart using chart tool"      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue: "toolsUsed is empty"                                 │
├─────────────────────────────────────────────────────────────┤
│ Cause: Chart tool not being called                         │
│ Fix: ✓ Be explicit in prompt: "use the chart tool"         │
│      ✓ Say: "generate a bar chart"                         │
│      ✓ Check /tools endpoint to verify tools available     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue: "MCP server connection failed"                       │
├─────────────────────────────────────────────────────────────┤
│ Cause: Server path or DB credentials wrong                 │
│ Fix: ✓ Check MCP_SERVER_PATH in .env                       │
│      ✓ Verify DATABASE_* credentials                       │
│      ✓ Run: npm run build (in parent dir)                  │
│      ✓ Check database is running                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue: "Session not persisting"                             │
├─────────────────────────────────────────────────────────────┤
│ Cause: Not including sessionId in follow-up requests       │
│ Fix: ✓ Save sessionId from first response                  │
│      ✓ Include it in subsequent requests                   │
│      ✓ Sessions expire after 1 hour of inactivity          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Response Format Explained

```javascript
{
  // Did the request succeed?
  "success": true,

  // The full text response from Claude (markdown formatted)
  "response": "Here are the top 5 barbers:\n1. Ronald...",

  // Array of chart image URLs (empty if no charts generated)
  "charts": [
    "https://mdn.alipayobjects.com/one_clip/afts/img/xxxxx/original"
  ],

  // Metadata about the request
  "metadata": {
    // Which MCP tools were called
    "toolsUsed": [
      "list_tables",           // Explored database
      "describe_table",        // Got table schema
      "read_query",            // Executed SQL
      "generate_bar_chart"     // Created chart
    ],

    // Cost in USD for this request
    "cost": 0.042,

    // Number of conversation turns (complexity indicator)
    "turns": 7,

    // Session ID for follow-up questions
    "sessionId": "session_1234567890_abc123"
  }
}
```

---

## 🎯 Best Practices

```
✅ DO:
  • Be specific in prompts: "Generate a bar chart using the chart tool"
  • Include sessionId for follow-up questions
  • Set appropriate timeout (60-120s for complex queries)
  • Monitor metadata.cost to track spending
  • Use DEBUG=true when troubleshooting

❌ DON'T:
  • Don't use vague prompts: "Show me a chart" ← Too vague
  • Don't ignore sessionId ← Loses context
  • Don't use default timeout ← May timeout on complex queries
  • Don't ignore errors ← Check success field first
```

---

**For complete details, read [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)!**

