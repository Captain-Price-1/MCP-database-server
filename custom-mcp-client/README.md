# Custom MCP Client with OpenAI Integration

A custom MCP (Model Context Protocol) client that connects to the ExecuteAutomation mcp-database-server and uses OpenAI's LLM for natural language database interactions.

## 🚀 Features

- **Natural Language Queries**: Ask questions in plain English about your database
- **Semantic Understanding**: Intelligently interprets analytical questions (e.g., "What are the quiet times?" generates GROUP BY queries, not literal column selects)
- **Multiple Database Support**: Works with SQLite, MySQL, PostgreSQL, and SQL Server
- **Intelligent SQL Generation**: Generates complex analytical queries with aggregations, GROUP BY, ORDER BY, etc.
- **OpenAI Integration**: Uses GPT-4 for natural language to SQL conversion
- **Interactive CLI**: Easy-to-use command-line interface
- **Schema Auto-Discovery**: Automatically loads database schema for accurate query generation

## 📋 Prerequisites

- Node.js (v18 or higher)
- OpenAI API key
- Built mcp-database-server (ExecuteAutomation)
- Database connection (MySQL, PostgreSQL, SQLite, or SQL Server)

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/Captain-Price-1/MCP-Test.git
cd MCP-Test

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Edit .env with your settings
nano .env
```

## ⚙️ Configuration

Edit the `.env` file with your settings:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Server Path
MCP_SERVER_PATH=../dist/src/index.js

# Database Configuration (MySQL example)
DATABASE_TYPE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=your_database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
```

## 🎯 Usage

### Interactive Mode

```bash
npm start
```

Then ask natural language questions:
- "What are the quiet times in reservations?"
- "Who are the top users?"
- "Show me all tables"
- "How many orders were placed last month?"
- "Find customers with more than 5 orders"

### Run Tests

```bash
# Test semantic query understanding
node test-semantic.js

# Test database connection
node test-connection.js

# Run diagnostic tests
node diagnose-reservations.js
```

### Run Examples

```bash
node examples/example-usage.js
```

## 💡 How It Works

1. **You ask a question** in natural language
2. **OpenAI analyzes** the intent and database schema
3. **Generates analytical SQL** (with GROUP BY, aggregations, etc.)
4. **MCP client executes** the query via mcp-database-server
5. **Results are formatted** and explained back to you

## 🎨 Example Queries

### Analytical Queries

- **"What are the quiet times?"** → Generates: `SELECT HOUR(time_column), COUNT(*) FROM table GROUP BY hour ORDER BY COUNT ASC`
- **"Who are the top customers?"** → Generates: `SELECT customer, COUNT(*) FROM orders GROUP BY customer ORDER BY COUNT DESC LIMIT 10`
- **"What's trending?"** → Generates queries with time-based aggregations

### Direct Queries

- "Show me all users"
- "How many records are in the products table?"
- "Insert a new user named John Doe"
- "Export the users table to CSV"

## 📁 Project Structure

```
custom-mcp-client/
├── src/
│   ├── index.js              # Main application entry point
│   ├── mcpClient.js          # MCP client implementation (STDIO transport)
│   ├── openaiService.js      # OpenAI integration with semantic understanding
│   ├── databaseService.js    # High-level database operations wrapper
│   └── test.js               # Test suite
├── examples/
│   └── example-usage.js      # Usage examples
├── package.json              # Dependencies
├── .env.example             # Environment variables template
└── README.md                 # This file
```

## 🔑 Key Features

### Semantic Query Understanding

The client understands the **intent** behind questions, not just literal keywords:

❌ **Bad (Literal)**: "quiet times" → `SELECT quiet_time FROM table`
✅ **Good (Semantic)**: "quiet times" → `SELECT HOUR(time), COUNT(*) FROM table GROUP BY hour ORDER BY count ASC`

### Intelligent Schema Loading

- Automatically discovers database tables and columns
- Provides context to OpenAI about data types and relationships
- Falls back to sampling data if schema tools fail

### Multiple Database Support

- **SQLite**: File-based database
- **MySQL**: Including Laravel applications
- **PostgreSQL**: With SSL support
- **SQL Server**: Windows/Linux compatible

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **OpenAI API** - Natural language processing
- **MCP SDK** - Model Context Protocol implementation
- **STDIO Transport** - Process-based communication

## 📊 Use Cases

1. **Laravel Applications**: Connect to your Laravel database and query with natural language
2. **Data Analysis**: Ask analytical questions about your data
3. **Business Intelligence**: Generate reports and insights
4. **Database Exploration**: Discover tables, relationships, and patterns
5. **Quick Queries**: Get answers without writing SQL

## 🔒 Security

- SQL injection protection via query validation
- Environment variable configuration for sensitive data
- Read-only mode available for safe querying
- Query validation before execution

## 🐛 Troubleshooting

### "Server not connected"
- Check if mcp-database-server is built
- Verify MCP_SERVER_PATH in .env

### "OpenAI API error"
- Verify OPENAI_API_KEY is correct
- Check API key permissions and billing

### "Database connection failed"
- Verify database is running
- Check connection parameters
- Ensure database exists and is accessible

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 🙏 Acknowledgments

- Built on top of [ExecuteAutomation's mcp-database-server](https://github.com/executeautomation/mcp-database-server)
- Powered by OpenAI's GPT models
- Uses Model Context Protocol (MCP) by Anthropic

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for the MCP community**