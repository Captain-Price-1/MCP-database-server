# Claude Agent Client for MCP Database Server

A production-ready implementation using Anthropic's Claude Agent SDK to interact with the MCP Database Server. This provides superior reasoning capabilities compared to OpenAI-based approaches, with built-in semantic understanding and agentic behavior.

## 🌟 Features

- **🤖 Claude-Powered**: Uses Claude Sonnet 4 for superior reasoning
- **🔗 MCP Integration**: Seamlessly connects to ExecuteAutomation's MCP Database Server
- **🧠 Semantic Understanding**: Automatically maps business concepts to database columns
- **🎯 Agentic Behavior**: Claude autonomously explores schema, reasons, and executes queries
- **📊 Multi-Database Support**: SQLite, MySQL, PostgreSQL, SQL Server
- **🎨 Interactive CLI**: Beautiful command-line interface
- **🛡️ Type-Safe**: Full TypeScript support (SDK)
- **⚡ Streaming**: Real-time response streaming
- **📈 Chart Generation**: Automatic chart creation via @antv/mcp-server-chart
- **🌐 REST API**: Laravel-ready HTTP API server

## 📚 Complete Documentation

- **[ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - 🏗️ **COMPLETE SYSTEM ARCHITECTURE** (Start here!)
  - How everything works together
  - Step-by-step flow diagrams
  - Code walkthrough
  - Why decisions were made
  - Troubleshooting guide
- **[API_README.md](./API_README.md)** - REST API quick reference
- **[LARAVEL_API_GUIDE.md](./LARAVEL_API_GUIDE.md)** - Complete Laravel integration
- **[QUICK_START.md](./QUICK_START.md)** - CLI client guide

## 📋 Prerequisites

- Node.js v18 or higher
- Claude API key (from Anthropic)
- MCP Database Server compiled (`npm run build` in parent directory)
- Database (SQLite, MySQL, PostgreSQL, or SQL Server)

## 🚀 Quick Start

### 1. Installation

```bash
cd claude-agent-client
npm install
```

### 2. Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env`:

```env
# Required: Your Claude API key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Database configuration (example for Laravel MySQL)
DATABASE_TYPE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=laravel
DATABASE_USER=root
DATABASE_PASSWORD=root

# Optional: Claude model (default: claude-sonnet-4-20250514)
CLAUDE_MODEL=claude-sonnet-4-20250514

# Optional: Permission mode (default: normal)
PERMISSION_MODE=normal
```

### 3. Run

```bash
npm start
```

## 📚 Usage

### Interactive Mode

```bash
npm start
```

Then type natural language queries:

```
> How many family bookings were made in 2023?

Claude: Let me explore the database schema first...
[Autonomously discovers tables, understands "family" means num_kids > 0]

Found 245 family bookings in 2023!

Breakdown:
- January: 25 bookings
- February: 18 bookings
...
```

### Test Suite

Run basic connectivity tests:

```bash
npm test
```

### Demo Mode

See comprehensive demonstrations:

```bash
npm run demo
```


## 🎯 Key Differences from OpenAI Client

| Feature | OpenAI Client | Claude Agent Client |
|---------|---------------|---------------------|
| **Reasoning** | Manual prompt engineering required | Built-in superior reasoning |
| **Schema Understanding** | Needs explicit instructions | Autonomously explores |
| **Concept Mapping** | Struggles with "family bookings" | Naturally understands |
| **Tool Usage** | Pre-determined by you | Decides autonomously |
| **Error Handling** | Basic | Investigates and retries |
| **Result Quality** | Good with proper prompts | Excellent by default |

## 💡 Example Queries

### Simple Exploration
```
> What tables are in the database?
> Show me the structure of the users table
```

### Semantic Queries
```
> How many family bookings in 2023?
> Which service was most popular in October?
> Who are the VIP users?
> What are the quiet times for reservations?
```

### Complex Analysis
```
> Give me the top 10 users by reservations with their names
> Show me revenue trends over the last 6 months
> Which products are frequently bought together?
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (required) | - |
| `CLAUDE_MODEL` | Claude model to use | claude-sonnet-4-20250514 |
| `PERMISSION_MODE` | Permission level | normal |
| `DATABASE_TYPE` | Database type | sqlite |
| `DATABASE_HOST` | Database host | localhost |
| `DATABASE_PORT` | Database port | (varies) |
| `DATABASE_NAME` | Database name | - |
| `DATABASE_USER` | Database username | - |
| `DATABASE_PASSWORD` | Database password | - |
| `MAX_TOKENS` | Max response tokens | 4096 |
| `DEBUG` | Enable debug mode | false |
| `VERBOSE` | Enable verbose output | false |

### Permission Modes

- **`fully-automatic`**: Claude has full autonomy, no permission prompts
- **`normal`**: Balanced (recommended for general use)
- **`restrictive`**: Asks permission for most operations

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   Claude Agent Client           │
│   (This Project)                │
└────────────┬────────────────────┘
             │
             │ Uses Claude Agent SDK
             ↓
┌─────────────────────────────────┐
│   Claude API (Anthropic)        │
│   - Claude Sonnet 4             │
│   - Superior reasoning          │
│   - Agentic behavior            │
└────────────┬────────────────────┘
             │
             │ STDIO Protocol
             ↓
┌─────────────────────────────────┐
│   MCP Database Server           │
│   (ExecuteAutomation)           │
│   - Unchanged                   │
│   - Same tools                  │
└────────────┬────────────────────┘
             │
             ↓
        [Your Database]
```

## 📂 Project Structure

```
claude-agent-client/
├── src/
│   ├── index.js          # Interactive CLI
│   ├── config.js         # Configuration loader
│   ├── test.js           # Test suite
│   └── demo.js           # Demonstration script
├── env.example           # Environment template
├── package.json          # Dependencies
└── README.md             # This file
```

## 🆚 Comparison with Custom OpenAI Client

### Lines of Code
- **OpenAI Client**: ~1500 lines of custom code
- **Claude Agent Client**: ~500 lines (SDK handles complexity)

### Prompt Engineering
- **OpenAI Client**: 700+ lines of carefully crafted prompts
- **Claude Agent Client**: SDK handles reasoning automatically

### Semantic Understanding
- **OpenAI**: "Family bookings" → needs explicit mapping to `num_kids > 0`
- **Claude**: Autonomously deduces "family" → explores schema → finds `num_kids`

### Error Handling
- **OpenAI**: Returns 0 rows, stops
- **Claude**: Investigates why, tries different approaches, reports accurately

## 🚦 Getting Started Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` from `env.example`
- [ ] Add your Claude API key
- [ ] Configure database settings
- [ ] Build MCP server (`cd .. && npm run build`)
- [ ] Run test suite (`npm test`)
- [ ] Try interactive mode (`npm start`)
- [ ] Run demo (`npm run demo`)

## 🔐 Security

- API keys are loaded from `.env` (never commit `.env`)
- Database credentials are passed via environment variables
- MCP server runs as a child process (isolated)
- No data is sent to Claude except query results

## 🐛 Troubleshooting

### "Configuration Error: ANTHROPIC_API_KEY is not set"
➡️ Copy `env.example` to `.env` and add your Claude API key

### "Error: Cannot find module '@anthropic-ai/claude-agent-sdk'"
➡️ Run `npm install`

### "MCP server not found"
➡️ Build the parent project: `cd .. && npm run build`

### "Connection refused" for MySQL
➡️ Check your database is running and credentials are correct

## 📖 Resources

- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/typescript)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [ExecuteAutomation MCP Server](https://github.com/executeautomation/mcp-database-server)

## 🤝 Credits

- **Claude Agent SDK**: Anthropic
- **MCP Database Server**: ExecuteAutomation
- **Claude Models**: Anthropic

## 📝 License

MIT

---

**Made with ❤️ using Claude Agent SDK**

