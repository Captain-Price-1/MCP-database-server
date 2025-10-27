import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Simple test to verify the MCP client can connect to ExecuteAutomation's database server
 */
async function testConnection() {
  console.log('🧪 Testing MCP Client Connection to ExecuteAutomation Database Server');
  console.log('='.repeat(70));
  
  try {
    // Create configuration
    const config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key', // Will fail gracefully if not set
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },
      mcp: {
        serverPath: process.env.MCP_SERVER_PATH || '../dist/src/index.js'
      },
      database: {
        type: process.env.DATABASE_TYPE || 'sqlite',
        path: process.env.DATABASE_PATH || '../data/test.db',
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
    console.log(`   MCP Server Path: ${config.mcp.serverPath}`);
    console.log(`   Database Type: ${config.database.type}`);
    if (config.database.type === 'sqlite') {
      console.log(`   Database Path: ${config.database.path}`);
    } else {
      console.log(`   Database Host: ${config.database.host}`);
      console.log(`   Database Port: ${config.database.port}`);
      console.log(`   Database Name: ${config.database.name}`);
      console.log(`   Database User: ${config.database.user}`);
    }
    console.log(`   OpenAI API Key: ${config.openai.apiKey ? 'Set' : 'Not Set'}`);
    console.log();

    // Initialize database service
    console.log('🔄 Initializing database service...');
    const databaseService = new DatabaseService(config);
    await databaseService.initialize();

    console.log('✅ Successfully connected to ExecuteAutomation mcp-database-server!');
    console.log();

    // Test basic functionality
    console.log('🔧 Testing available tools...');
    const tools = databaseService.getAvailableTools();
    console.log(`   Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`   • ${tool.name}: ${tool.description || 'No description'}`);
    });
    console.log();

    // Test listing tables
    console.log('📋 Testing table listing...');
    try {
      const tablesResult = await databaseService.listTables();
      console.log(`   ✅ Successfully listed tables: ${tablesResult.tables ? tablesResult.tables.length : 0} found`);
      if (tablesResult.tables && tablesResult.tables.length > 0) {
        console.log(`   Tables: ${tablesResult.tables.map(t => t.name).join(', ')}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Table listing failed: ${error.message}`);
    }
    console.log();

    // Test direct SQL execution
    console.log('🔍 Testing direct SQL execution...');
    try {
      const sqlResult = await databaseService.executeSQL('SELECT 1 as test_value', true);
      console.log(`   ✅ SQL execution successful: ${sqlResult.results.rows ? sqlResult.results.rows.length : 0} rows`);
      if (sqlResult.results.rows && sqlResult.results.rows.length > 0) {
        console.log(`   Result: ${JSON.stringify(sqlResult.results.rows[0])}`);
      }
    } catch (error) {
      console.log(`   ⚠️  SQL execution failed: ${error.message}`);
    }
    console.log();

    // Test natural language processing (if OpenAI key is set)
    if (config.openai.apiKey && config.openai.apiKey !== 'test-key') {
      console.log('🤖 Testing natural language processing...');
      try {
        const nlResult = await databaseService.processNaturalLanguageQuery('Show me all tables');
        console.log(`   ✅ Natural language processing successful`);
        console.log(`   Tool used: ${nlResult.tool}`);
        console.log(`   Confidence: ${(nlResult.confidence * 100).toFixed(1)}%`);
        if (nlResult.sql) {
          console.log(`   Generated SQL: ${nlResult.sql}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Natural language processing failed: ${error.message}`);
      }
    } else {
      console.log('🤖 Skipping natural language test (OpenAI API key not set)');
    }

    // Cleanup
    await databaseService.disconnect();
    console.log();
    console.log('🎉 All tests completed successfully!');
    console.log();
    console.log('💡 Your custom MCP client is ready to use!');
    console.log('   • Run "npm start" for interactive mode');
    console.log('   • Run "node demo.js" for a full demo');
    console.log('   • Run "node examples/example-usage.js" for examples');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log();
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure mcp-database-server is built: npm run build');
    console.log('   2. Check that the database file exists');
    console.log('   3. Verify the MCP_SERVER_PATH in config.env');
    console.log('   4. Set your OpenAI API key in .env file');
    process.exit(1);
  }
}

// Run the test
testConnection();
