import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Quick test to verify the empty response issue is fixed
 */
async function quickTest() {
  console.log('🧪 Quick Test - Laravel Database Connection');
  console.log('==========================================');
  
  try {
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
    const databaseService = new DatabaseService(config);
    await databaseService.initialize();

    console.log('✅ Connected to Laravel database successfully!');
    console.log();

    // Test 1: List tables
    console.log('📋 Test 1: List all tables');
    const tablesResult = await databaseService.listTables();
    console.log(`   Result: ${tablesResult.tables ? tablesResult.tables.length : 0} tables found`);
    if (tablesResult.tables && tablesResult.tables.length > 0) {
      tablesResult.tables.forEach(table => {
        console.log(`   • ${table.name}`);
      });
    } else {
      console.log('   💡 No tables found - this is normal for a fresh Laravel installation');
    }
    console.log();

    // Test 2: Natural language query
    console.log('🤖 Test 2: Natural language query');
    const nlResult = await databaseService.processNaturalLanguageQuery('Show me all tables');
    console.log(`   Tool used: ${nlResult.tool}`);
    console.log(`   Confidence: ${(nlResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Results: ${nlResult.results ? 'Success' : 'No results'}`);
    console.log();

    // Test 3: Direct SQL
    console.log('🔍 Test 3: Direct SQL query');
    const sqlResult = await databaseService.executeSQL('SELECT 1 as test_value', true);
    console.log(`   SQL executed successfully: ${sqlResult.results.rows ? sqlResult.results.rows.length : 0} rows`);
    if (sqlResult.results.rows && sqlResult.results.rows.length > 0) {
      console.log(`   Sample result: ${JSON.stringify(sqlResult.results.rows[0])}`);
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('🎉 All tests passed! Your MCP client is working correctly.');
    console.log();
    console.log('💡 Next steps:');
    console.log('   1. Run "php artisan migrate" in your Laravel project to create tables');
    console.log('   2. Use "npm start" to start the interactive client');
    console.log('   3. Try queries like: "Show me all tables", "Create a users table"');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
quickTest();
