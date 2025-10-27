# Custom MCP Client with OpenAI Integration

A complete custom MCP (Model Context Protocol) client that connects to your mcp-database-server and uses OpenAI's LLM for natural language database interactions.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js (v18 or higher)
- OpenAI API key
- Built mcp-database-server (in the parent directory)

### 2. Installation

```bash
# Navigate to the custom client directory
cd custom-mcp-client

# Run the setup script
./setup.sh

# Or manually:
npm install
cp env.example .env
# Edit .env with your configuration
```

### 3. Configuration

Edit the `.env` file with your settings:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Server Path
MCP_SERVER_PATH=../mcp-database-server/dist/src/index.js

# Database Configuration (choose one)
DATABASE_TYPE=sqlite
DATABASE_PATH=../mcp-database-server/data/test.db
```

### 4. Run the Client

```bash
# Interactive mode
npm start

# Run examples
node examples/example-usage.js

# Run tests
npm test
```

## 📁 Project Structure

```
custom-mcp-client/
├── package.json              # Dependencies and scripts
├── env.example              # Environment variables template
├── setup.sh                 # Automated setup script
├── README.md                # This documentation
├── src/
│   ├── index.js             # Main application entry point
│   ├── mcpClient.js         # MCP client implementation
│   ├── openaiService.js     # OpenAI integration
│   ├── databaseService.js   # Database operations wrapper
│   └── test.js              # Test suite
└── examples/
    └── example-usage.js     # Usage examples
```

## 🔧 Core Components

### 1. MCPClient (`src/mcpClient.js`)

The core MCP client that handles communication with the mcp-database-server using STDIO transport.

**Key Features:**
- STDIO transport implementation
- JSON-RPC 2.0 protocol support
- Automatic server lifecycle management
- Request/response handling with timeouts
- Event-driven architecture

**Usage:**
```javascript
import { MCPClient } from './src/mcpClient.js';

const client = new MCPClient('/path/to/server', ['--sqlite', '/path/to/db']);
await client.connect();
const tools = await client.listTools();
```

### 2. OpenAIService (`src/openaiService.js`)

Handles natural language to SQL conversion and database interaction assistance.

**Key Features:**
- Natural language to SQL conversion
- SQL query validation
- Result explanation generation
- Follow-up question suggestions
- Confidence scoring

**Usage:**
```javascript
import { OpenAIService } from './src/openaiService.js';

const openai = new OpenAIService('your-api-key');
const result = await openai.convertToSQL('Show me all users');
```

### 3. DatabaseService (`src/databaseService.js`)

High-level service that combines MCP client and OpenAI service for seamless database operations.

**Key Features:**
- Unified interface for database operations
- Natural language query processing
- Automatic schema loading
- Error handling and logging
- Multiple database type support

**Usage:**
```javascript
import { DatabaseService } from './src/databaseService.js';

const dbService = new DatabaseService(config);
await dbService.initialize();
const result = await dbService.processNaturalLanguageQuery('Show me all tables');
```

## 🗄️ Database Support

The client supports all database types that mcp-database-server supports:

### SQLite
```bash
DATABASE_TYPE=sqlite
DATABASE_PATH=/path/to/database.db
```

### PostgreSQL
```bash
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=your_database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=true
```

### MySQL
```bash
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=your_database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=true
```

### SQL Server
```bash
DATABASE_TYPE=sqlserver
DATABASE_SERVER=localhost
DATABASE_NAME=your_database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
```

## 💬 Natural Language Queries

The client can process various types of natural language queries:

### Table Operations
- "Show me all tables"
- "What tables are available?"
- "List the database structure"

### Data Queries
- "Show me all users"
- "Find customers with more than 5 orders"
- "How many products do we have?"

### Schema Queries
- "What is the structure of the users table?"
- "Describe the products table"
- "Show me the columns in the orders table"

### Aggregation Queries
- "How many orders were placed last month?"
- "What is the average order value?"
- "Count the number of users by country"

## 🔧 Available Commands

When running in interactive mode (`npm start`):

- **Natural language queries** - Ask questions about your data
- `tables` - List all available tables
- `tools` - Show available MCP tools
- `status` - Show application status
- `help` - Show help message
- `exit` or `quit` - Exit the application

## 🧪 Testing

The project includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test file
node src/test.js
```

**Test Coverage:**
- MCP client connection
- Tool listing and execution
- Natural language processing
- SQL execution
- Error handling
- Database operations

## 📊 Example Output

```
🚀 Starting Custom MCP Client with OpenAI Integration

✅ MCP client connected successfully
📋 Found 5 available tools
📁 Found 0 available resources
📋 Database schema loaded

✅ Custom MCP Client ready!
💡 Type your natural language queries or "help" for commands

> Show me all tables

🔄 Processing query...

📝 Generated list_tables with confidence: 0.95
💡 Explanation: User wants to see all available tables in the database

📊 Results:
──────────────────────────────────────────────────
🔍 SQL Query: SELECT name FROM sqlite_master WHERE type='table'
🎯 Tool Used: list_tables
📈 Confidence: 95.0%

📋 Found 3 row(s):
name
──────────────────────────────────────────────────
users
products
orders

💡 Explanation: The database contains 3 tables: users, products, and orders

──────────────────────────────────────────────────
```

## 🔒 Security Considerations

- **SQL Injection Protection**: The OpenAI service includes SQL validation
- **API Key Security**: Store OpenAI API key in environment variables
- **Database Credentials**: Use environment variables for sensitive data
- **Query Validation**: All generated SQL is validated before execution

## 🐛 Troubleshooting

### Common Issues

1. **"Server not connected"**
   - Check if mcp-database-server is built
   - Verify MCP_SERVER_PATH in .env
   - Ensure database connection parameters are correct

2. **"OpenAI API error"**
   - Verify OPENAI_API_KEY is set correctly
   - Check API key permissions and billing
   - Ensure internet connectivity

3. **"Database connection failed"**
   - Verify database is running
   - Check connection parameters
   - Ensure database exists and is accessible

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=mcp-client,openai-service,database-service
```

## 🔄 Development

### Adding New Features

1. **New Database Operations**: Extend `DatabaseService` class
2. **Enhanced NLP**: Modify `OpenAIService` prompts
3. **Additional Tools**: Update MCP client tool handling

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📚 API Reference

### MCPClient Methods

- `connect()` - Connect to MCP server
- `disconnect()` - Disconnect from server
- `listTools()` - Get available tools
- `callTool(name, args)` - Execute a tool
- `isClientConnected()` - Check connection status

### OpenAIService Methods

- `convertToSQL(query, schema, tools)` - Convert natural language to SQL
- `validateSQL(sql)` - Validate SQL for security
- `explainResults(query, results, original)` - Explain query results
- `suggestFollowUps(query, results)` - Suggest follow-up questions

### DatabaseService Methods

- `initialize()` - Initialize the service
- `processNaturalLanguageQuery(query)` - Process natural language query
- `executeSQL(sql, readOnly)` - Execute raw SQL
- `listTables()` - List database tables
- `describeTable(name)` - Get table structure
- `disconnect()` - Disconnect from database

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Support

- GitHub Issues: Report bugs and request features
- Documentation: Check this README and inline code comments
- Examples: See `examples/` directory for usage patterns

---

**Happy querying! 🚀**
