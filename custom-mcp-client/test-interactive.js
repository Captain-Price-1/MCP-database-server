import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Quick test to verify interactive display works
 */
async function testInteractiveDisplay() {
  console.log('🧪 Testing Interactive Display');
  console.log('==============================');
  console.log();

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
        password: process.env.DATABASE_PASSWORD
      }
    };

    // Initialize database service
    const databaseService = new DatabaseService(config);
    await databaseService.initialize();

    console.log('✅ Connected to database');
    console.log();

    // Test 1: "How many tables are there?"
    console.log('💬 Test Query: "how many tables are there?"');
    console.log('─'.repeat(50));
    const result1 = await databaseService.processNaturalLanguageQuery('how many tables are there?');
    
    console.log('📊 Result:');
    console.log(`   Tool: ${result1.tool}`);
    console.log(`   Rows returned: ${result1.results.rows ? result1.results.rows.length : 0}`);
    
    if (result1.results.rows && result1.results.rows.length > 0) {
      console.log('   Data:');
      result1.results.rows.forEach((row, index) => {
        console.log(`      ${index + 1}. ${JSON.stringify(row)}`);
      });
    }
    console.log();

    // Test 2: "Show me all tables"
    console.log('💬 Test Query: "Show me all tables"');
    console.log('─'.repeat(50));
    const result2 = await databaseService.processNaturalLanguageQuery('Show me all tables');
    
    console.log('📊 Result:');
    console.log(`   Tool: ${result2.tool}`);
    console.log(`   Rows returned: ${result2.results.rows ? result2.results.rows.length : 0}`);
    
    if (result2.results.rows && result2.results.rows.length > 0) {
      console.log('   Tables:');
      result2.results.rows.slice(0, 5).forEach((row, index) => {
        console.log(`      ${index + 1}. ${JSON.stringify(row)}`);
      });
      if (result2.results.rows.length > 5) {
        console.log(`      ... and ${result2.results.rows.length - 5} more`);
      }
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('🎉 Test completed successfully!');
    console.log();
    console.log('✅ The interactive client should now display results correctly.');
    console.log('   Try running: npm start');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInteractiveDisplay();
