import dotenv from 'dotenv';
import { createInterface } from 'readline';
import { DatabaseService } from './databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Main application class
 */
class CustomMCPClient {
  constructor() {
    this.databaseService = null;
    this.rl = null;
    this.isRunning = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('🚀 Starting Custom MCP Client with OpenAI Integration\n');

      // Validate environment variables
      this.validateEnvironment();

      // Create configuration
      const config = this.createConfig();

      // Initialize database service
      this.databaseService = new DatabaseService(config);
      await this.databaseService.initialize();

      // Set up interactive interface
      this.setupInteractiveInterface();

      console.log('\n✅ Custom MCP Client ready!');
      console.log('💡 Type your natural language queries or "help" for commands\n');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = ['OPENAI_API_KEY', 'MCP_SERVER_PATH', 'DATABASE_TYPE'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate database-specific variables
    const dbType = process.env.DATABASE_TYPE;
    if (dbType === 'sqlite' && !process.env.DATABASE_PATH) {
      throw new Error('DATABASE_PATH is required for SQLite');
    }
    if (['postgresql', 'mysql', 'sqlserver'].includes(dbType)) {
      const requiredDbVars = ['DATABASE_HOST', 'DATABASE_NAME'];
      const missingDbVars = requiredDbVars.filter(key => !process.env[key]);
      if (missingDbVars.length > 0) {
        throw new Error(`Missing required database variables for ${dbType}: ${missingDbVars.join(', ')}`);
      }
    }
  }

  /**
   * Create configuration object from environment variables
   */
  createConfig() {
    const config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o'
      },
      mcp: {
        serverPath: process.env.MCP_SERVER_PATH
      },
      database: {
        type: process.env.DATABASE_TYPE,
        path: process.env.DATABASE_PATH,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : undefined,
        name: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: process.env.DATABASE_SSL === 'true',
        server: process.env.DATABASE_SERVER,
        awsIamAuth: process.env.DATABASE_AWS_IAM_AUTH === 'true',
        awsRegion: process.env.DATABASE_AWS_REGION
      }
    };

    return config;
  }

  /**
   * Set up interactive command line interface
   */
  setupInteractiveInterface() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    this.rl.on('line', async (input) => {
      const command = input.trim();
      
      if (command === '') {
        this.rl.prompt();
        return;
      }

      if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
        await this.shutdown();
        return;
      }

      if (command.toLowerCase() === 'help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }

      if (command.toLowerCase() === 'tables') {
        await this.listTables();
        this.rl.prompt();
        return;
      }

      if (command.toLowerCase() === 'tools') {
        this.listTools();
        this.rl.prompt();
        return;
      }

      if (command.toLowerCase() === 'status') {
        this.showStatus();
        this.rl.prompt();
        return;
      }

      // Process natural language query
      await this.processQuery(command);
      this.rl.prompt();
    });

    this.rl.on('close', async () => {
      await this.shutdown();
    });

    this.rl.prompt();
    this.isRunning = true;
  }

  /**
   * Process a natural language query
   */
  async processQuery(query) {
    try {
      console.log('\n🔄 Processing query...\n');
      
      const result = await this.databaseService.processNaturalLanguageQuery(query);
      
      // Display results
      this.displayResults(result);
      
    } catch (error) {
      console.error(`❌ Error processing query: ${error.message}`);
    }
  }

  /**
   * Display query results
   */
  displayResults(result) {
    console.log('📊 Results:');
    console.log('─'.repeat(50));
    
    if (result.sql) {
      console.log(`🔍 SQL Query: ${result.sql}`);
      console.log(`🎯 Tool Used: ${result.tool}`);
      console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }
    
    if (result.results && result.results.rows) {
      const rows = result.results.rows;
      console.log(`\n📋 Found ${rows.length} row(s):`);
      
      if (rows.length > 0) {
        // Display as table
        this.displayTable(rows);
      }
    }
    
    if (result.explanation) {
      console.log(`\n💡 Explanation: ${result.explanation}`);
    }
    
    if (result.followUps) {
      console.log(`\n🤔 Suggested follow-ups:\n${result.followUps}`);
    }
    
    if (result.validation && !result.validation.safe) {
      console.log(`\n⚠️ Security Note: ${result.validation.recommendation}`);
    }
    
    console.log('\n' + '─'.repeat(50));
  }

  /**
   * Display results as a table
   */
  displayTable(rows) {
    if (rows.length === 0) return;
    
    const columns = Object.keys(rows[0]);
    const maxWidths = {};
    
    // Calculate column widths
    columns.forEach(col => {
      maxWidths[col] = Math.max(col.length, ...rows.map(row => String(row[col] || '').length));
    });
    
    // Display header
    const header = columns.map(col => col.padEnd(maxWidths[col])).join(' | ');
    console.log(header);
    console.log(columns.map(() => '─'.repeat(maxWidths[columns.indexOf(columns[0])])).join('─┼─'));
    
    // Display rows (limit to 20 for readability)
    const displayRows = rows.slice(0, 20);
    displayRows.forEach(row => {
      const rowStr = columns.map(col => String(row[col] || '').padEnd(maxWidths[col])).join(' | ');
      console.log(rowStr);
    });
    
    if (rows.length > 20) {
      console.log(`... and ${rows.length - 20} more rows`);
    }
  }

  /**
   * List available tables
   */
  async listTables() {
    try {
      const result = await this.databaseService.listTables();
      console.log('\n📋 Available Tables:');
      console.log('─'.repeat(30));
      
      if (result.tables && result.tables.length > 0) {
        result.tables.forEach(table => {
          console.log(`• ${table.name}`);
        });
      } else {
        console.log('No tables found');
      }
      
    } catch (error) {
      console.error(`❌ Error listing tables: ${error.message}`);
    }
  }

  /**
   * List available tools
   */
  listTools() {
    const tools = this.databaseService.getAvailableTools();
    console.log('\n🔧 Available Tools:');
    console.log('─'.repeat(40));
    
    tools.forEach(tool => {
      console.log(`• ${tool.name}: ${tool.description || 'No description'}`);
    });
  }

  /**
   * Show application status
   */
  showStatus() {
    console.log('\n📊 Application Status:');
    console.log('─'.repeat(30));
    console.log(`🔌 MCP Client: ${this.databaseService.isServiceConnected() ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`🤖 OpenAI Service: ${this.databaseService.openaiService ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`📊 Database Schema: ${this.databaseService.databaseSchema ? '✅ Loaded' : '❌ Not Loaded'}`);
    console.log(`🔧 Available Tools: ${this.databaseService.getAvailableTools().length}`);
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('\n📖 Available Commands:');
    console.log('─'.repeat(40));
    console.log('• Natural language queries - Ask questions about your data');
    console.log('• "tables" - List all available tables');
    console.log('• "tools" - Show available MCP tools');
    console.log('• "status" - Show application status');
    console.log('• "help" - Show this help message');
    console.log('• "exit" or "quit" - Exit the application');
    console.log('\n💡 Example queries:');
    console.log('• "Show me all users"');
    console.log('• "How many orders were placed last month?"');
    console.log('• "What is the structure of the products table?"');
    console.log('• "Find customers with more than 5 orders"');
  }

  /**
   * Shutdown the application
   */
  async shutdown() {
    console.log('\n🔄 Shutting down...');
    
    if (this.databaseService) {
      await this.databaseService.disconnect();
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    console.log('👋 Goodbye!');
    process.exit(0);
  }

  /**
   * Start the application
   */
  async start() {
    await this.initialize();
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n\n🔄 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🔄 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
const app = new CustomMCPClient();
app.start().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
