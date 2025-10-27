import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Example usage of the custom MCP client
 */
class ExampleUsage {
  constructor() {
    this.databaseService = null;
  }

  /**
   * Initialize the example
   */
  async initialize() {
    console.log('📚 Custom MCP Client - Example Usage\n');

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

    // Initialize database service
    this.databaseService = new DatabaseService(config);
    await this.databaseService.initialize();

    console.log('✅ Example initialized!\n');
  }

  /**
   * Run example queries
   */
  async runExamples() {
    const examples = [
      {
        title: 'Basic Table Listing',
        query: 'Show me all tables in the database',
        description: 'Demonstrates basic table discovery'
      },
      {
        title: 'Table Structure',
        query: 'What is the structure of the first table?',
        description: 'Shows how to get table schema information'
      },
      {
        title: 'Data Query',
        query: 'Show me some sample data from the database',
        description: 'Demonstrates data retrieval with natural language'
      },
      {
        title: 'Count Query',
        query: 'How many records are in each table?',
        description: 'Shows aggregation queries'
      },
      {
        title: 'Complex Query',
        query: 'Find tables that have more than 5 columns',
        description: 'Demonstrates more complex natural language processing'
      }
    ];

    for (const example of examples) {
      await this.runExample(example);
    }
  }

  /**
   * Run a single example
   */
  async runExample(example) {
    console.log(`📝 Example: ${example.title}`);
    console.log(`💡 ${example.description}`);
    console.log(`❓ Query: "${example.query}"`);
    console.log('─'.repeat(60));

    try {
      const result = await this.databaseService.processNaturalLanguageQuery(example.query);
      
      console.log(`🔧 Tool Used: ${result.tool}`);
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (result.sql) {
        console.log(`🔍 Generated SQL: ${result.sql}`);
      }
      
      if (result.results && result.results.rows) {
        console.log(`📋 Results: ${result.results.rows.length} row(s) returned`);
        
        // Show first few rows
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
    
    console.log('\n' + '─'.repeat(60) + '\n');
  }

  /**
   * Demonstrate direct SQL execution
   */
  async demonstrateDirectSQL() {
    console.log('🔧 Direct SQL Execution Examples');
    console.log('─'.repeat(50));

    const sqlQueries = [
      'SELECT 1 as test_value',
      'SELECT name FROM sqlite_master WHERE type="table" LIMIT 5',
      'SELECT COUNT(*) as total_tables FROM sqlite_master WHERE type="table"'
    ];

    for (const sql of sqlQueries) {
      console.log(`🔍 Executing: ${sql}`);
      
      try {
        const result = await this.databaseService.executeSQL(sql, true);
        
        if (result.results && result.results.rows) {
          console.log(`   ✅ Success: ${result.results.rows.length} row(s)`);
          if (result.results.rows.length > 0) {
            console.log(`   📊 Sample:`, result.results.rows[0]);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log();
    }
  }

  /**
   * Demonstrate tool capabilities
   */
  async demonstrateTools() {
    console.log('🔧 Available Tools Demonstration');
    console.log('─'.repeat(50));

    const tools = this.databaseService.getAvailableTools();
    console.log(`📋 Found ${tools.length} available tools:\n`);

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
   * Cleanup
   */
  async cleanup() {
    if (this.databaseService) {
      await this.databaseService.disconnect();
    }
    console.log('👋 Example completed!');
  }
}

// Run the example
async function runExample() {
  const example = new ExampleUsage();
  
  try {
    await example.initialize();
    
    console.log('🚀 Running Natural Language Query Examples\n');
    await example.runExamples();
    
    console.log('🔧 Running Direct SQL Examples\n');
    await example.demonstrateDirectSQL();
    
    console.log('📋 Running Tools Demonstration\n');
    await example.demonstrateTools();
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    await example.cleanup();
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n\n🔄 Example interrupted');
  process.exit(0);
});

// Start the example
runExample();
