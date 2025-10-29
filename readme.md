# MCP Database Server with Custom Client

A comprehensive MCP (Model Context Protocol) database server with a custom client featuring OpenAI-powered natural language query capabilities.

## 🚀 Project Overview

This repository contains two main components:

1. **MCP Database Server** (ExecuteAutomation) - The core database server supporting multiple database types
2. **Custom MCP Client** - An intelligent client with OpenAI integration for natural language database queries

## 📦 Components

### 1. MCP Database Server

The core MCP server that provides database connectivity and tools for:
- **SQLite** - File-based database support
- **MySQL/MariaDB** - Including Laravel applications
- **PostgreSQL** - With SSL support
- **SQL Server** - Windows/Linux compatible

**Features:**
- Multiple database type support
- STDIO transport for MCP communication
- Tools for querying, schema inspection, and data manipulation
- Safe query execution with validation
- Export capabilities (CSV, JSON)

### 2. Custom MCP Client (`custom-mcp-client/`)

An intelligent MCP client with advanced features:
- **Natural Language Processing** - Ask questions in plain English
- **Semantic Query Understanding** - Generates analytical SQL (GROUP BY, aggregations)
- **OpenAI Integration** - GPT-4 powered query generation
- **Interactive CLI** - User-friendly command-line interface
- **Auto Schema Discovery** - Automatically learns your database structure
- **Laravel Support** - Special setup for Laravel applications

## 🎯 Key Features

### Semantic Query Understanding

The custom client understands the **intent** behind questions:

❌ **Literal (Basic)**: "quiet times" → `SELECT quiet_time FROM table`
✅ **Semantic (Smart)**: "quiet times" → `SELECT HOUR(time), COUNT(*) FROM table GROUP BY hour ORDER BY count ASC`

### Example Queries

- "What are the quiet times in reservations?"
- "Who are the top customers?"
- "What products are most popular?"
- "Show me trends over the last month"
- "Find users with more than 5 orders"

## 🔧 Installation

### Prerequisites

- Node.js (v18 or higher)
- OpenAI API key (for custom client)
- Database (MySQL, PostgreSQL, SQLite, or SQL Server)

### Setup

```bash
# Clone the repository
git clone https://github.com/Captain-Price-1/MCP-database-server.git
cd MCP-database-server

# Install server dependencies
npm install
npm run build

# Setup custom client
cd custom-mcp-client
npm install
cp env.example .env
# Edit .env with your OpenAI API key and database settings
```

## 🚀 Quick Start

### Running the MCP Server

```bash
# SQLite
node dist/src/index.js /path/to/database.db

# MySQL
node dist/src/index.js --mysql --host localhost --database mydb --user root --password pass

# PostgreSQL
node dist/src/index.js --postgresql --host localhost --database mydb --user postgres --password pass

# SQL Server
node dist/src/index.js --sqlserver --server localhost --database mydb --user sa --password pass
```

### Running the Custom Client

```bash
cd custom-mcp-client
npm start
```

Then ask natural language questions:
```
> What are the quiet times in reservations?
> Who are the top users?
> Show me all tables
```

## 📁 Project Structure

```
mcp-database-server/
├── src/                      # Server source code
│   ├── db/                   # Database adapters
│   ├── handlers/             # Request handlers
│   ├── tools/                # Database tools
│   └── utils/                # Utilities
├── custom-mcp-client/        # Custom client with OpenAI
│   ├── src/                  # Client source code
│   │   ├── mcpClient.js      # MCP STDIO transport
│   │   ├── openaiService.js  # Semantic understanding
│   │   ├── databaseService.js # Database operations
│   │   └── index.js          # Interactive CLI
│   ├── examples/             # Usage examples
│   └── README.md             # Client documentation
├── docs/                     # Documentation
├── examples/                 # Server examples
└── README.md                 # This file
```

## 🎨 Use Cases

1. **Laravel Applications** - Query your Laravel database with natural language
2. **Data Analysis** - Ask analytical questions about your data
3. **Business Intelligence** - Generate reports and insights
4. **Database Exploration** - Discover tables, relationships, and patterns
5. **Quick Prototyping** - Test queries without writing SQL

## 🛠️ Technologies

- **Node.js** - Runtime environment
- **TypeScript** - Server implementation
- **OpenAI API** - Natural language processing (client)
- **MCP SDK** - Model Context Protocol
- **STDIO Transport** - Process-based communication
- Multiple database drivers (sqlite3, mysql2, pg, mssql)

## 📖 Documentation

- [Server README](./readme.md) - Original server documentation
- [Custom Client README](./custom-mcp-client/README.md) - Client documentation
- [Laravel Setup Guide](./custom-mcp-client/LARAVEL_SETUP.md) - Laravel-specific setup
- [Quick Start Guide](./custom-mcp-client/QUICK_START.md) - Quick setup guide

## 🔒 Security

- SQL injection protection via query validation
- Environment variable configuration for sensitive data
- Read-only mode available for safe querying
- GitHub push protection for API keys
- Proper .gitignore configuration

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📝 License

MIT License

## 🙏 Acknowledgments

- **Server**: Based on [ExecuteAutomation's mcp-database-server](https://github.com/executeautomation/mcp-database-server)
- **MCP Protocol**: By Anthropic
- **OpenAI**: For GPT models powering semantic understanding

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Check the documentation in `/docs` and `/custom-mcp-client`

## 🌟 Features Highlights

### Server Features
- ✅ Multiple database type support
- ✅ STDIO transport for MCP
- ✅ Comprehensive database tools
- ✅ Schema inspection
- ✅ Query execution with validation
- ✅ Export capabilities

### Custom Client Features
- ✅ Natural language query understanding
- ✅ Semantic SQL generation
- ✅ OpenAI integration
- ✅ Interactive CLI
- ✅ Auto schema discovery
- ✅ Laravel support
- ✅ Comprehensive testing suite

## 🚦 Status

- Server: ✅ Production ready
- Custom Client: ✅ Fully functional
- Documentation: ✅ Complete
- Tests: ✅ Comprehensive

---

**Made with ❤️ for the MCP community**

Original server by [ExecuteAutomation](https://github.com/executeautomation)
Custom client and enhancements by [Captain-Price-1](https://github.com/Captain-Price-1)