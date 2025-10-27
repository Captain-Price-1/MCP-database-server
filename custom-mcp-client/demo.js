import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables from config.env
dotenv.config({ path: './config.env' });

/**
 * Demo script showing how the custom MCP client connects to ExecuteAutomation's mcp-database-server
 */
class MCPClientDemo {
  constructor() {
    this.databaseService = null;
  }

  /**
   * Initialize the demo
   */
  async initialize() {
    console.log('🚀 Custom MCP Client Demo');
    console.log('Connecting to ExecuteAutomation mcp-database-server...\n');

    // Create configuration
    const config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
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

    console.log('📋 Configuration:');
    console.log(`   MCP Server: ${config.mcp.serverPath}`);
    console.log(`   Database Type: ${config.database.type}`);
    console.log(`   Database Path: ${config.database.path}`);
    console.log(`   OpenAI Model: ${config.openai.model}`);
    console.log();

    // Initialize database service
    this.databaseService = new DatabaseService(config);
    await this.databaseService.initialize();

    console.log('✅ Connected to ExecuteAutomation mcp-database-server!\n');
  }

  /**
   * Demonstrate natural language queries
   */
  async demonstrateQueries() {
    const queries = [
      'Show me all tables in the database',
      'What tables are available?',
      'List the structure of the first table',
      'How many tables do we have?'
    ];

    console.log('💬 Natural Language Query Demo');
    console.log('─'.repeat(50));

    for (const query of queries) {
      console.log(`\n❓ Query: "${query}"`);
      console.log('🔄 Processing...');

      try {
        const result = await this.databaseService.processNaturalLanguageQuery(query);
        
        console.log(`✅ Success!`);
        console.log(`🔧 Tool Used: ${result.tool}`);
        console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        
        if (result.sql) {
          console.log(`🔍 Generated SQL: ${result.sql}`);
        }
        
        if (result.results && result.results.rows) {
          console.log(`📋 Results: ${result.results.rows.length} row(s)`);
          
          // Show first few results
          const displayRows = result.results.rows.slice(0, 3);
          displayRows.forEach((row, index) => {
            console.log(`   Row ${index + 1}:`, Object.keys(row).map(key => `${key}=${row[key]}`).join(', '));
          });
          
          if (result.results.rows.length > 3) {
            console.log(`   ... and ${result.results.rows.length - 3} more rows`);
          }
        }
        
        if (result.explanation) {
          console.log(`💡 Explanation: ${result.explanation}`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      console.log('─'.repeat(50));
    }
  }

  /**
   * Show available tools
   */
  async showAvailableTools() {
    console.log('\n🔧 Available MCP Tools from ExecuteAutomation:');
    console.log('─'.repeat(50));
    
    const tools = this.databaseService.getAvailableTools();
    
    tools.forEach(tool => {
      console.log(`• ${tool.name}`);
      console.log(`  Description: ${tool.description || 'No description available'}`);
      if (tool.inputSchema && tool.inputSchema.properties) {
        console.log(`  Parameters: ${Object.keys(tool.inputSchema.properties).join(', ')}`);
      }
      console.log();
    });
  }

  /**
   * Demonstrate direct SQL execution
   */
  async demonstrateDirectSQL() {
    console.log('\n🔍 Direct SQL Execution Demo:');
    console.log('─'.repeat(50));

    const sqlQueries = [
      'SELECT name FROM sqlite_master WHERE type="table" LIMIT 5',
      'SELECT COUNT(*) as total_tables FROM sqlite_master WHERE type="table"'
    ];

    for (const sql of sqlQueries) {
      console.log(`\n🔍 Executing: ${sql}`);
      
      try {
        const result = await this.databaseService.executeSQL(sql, true);
        
        if (result.results && result.results.rows) {
          console.log(`✅ Success: ${result.results.rows.length} row(s)`);
          if (result.results.rows.length > 0) {
            console.log(`📊 Results:`, result.results.rows);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.databaseService) {
      await this.databaseService.disconnect();
    }
    console.log('\n👋 Demo completed!');
  }
}

// Run the demo
async function runDemo() {
  const demo = new MCPClientDemo();
  
  try {
    await demo.initialize();
    await demo.showAvailableTools();
    await demo.demonstrateDirectSQL();
    await demo.demonstrateQueries();
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\n💡 Make sure to:');
    console.log('   1. Set your OpenAI API key in config.env');
    console.log('   2. Ensure the mcp-database-server is built');
    console.log('   3. Check that the database path is correct');
  } finally {
    await demo.cleanup();
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n\n🔄 Demo interrupted');
  process.exit(0);
});

// Start the demo
runDemo();
