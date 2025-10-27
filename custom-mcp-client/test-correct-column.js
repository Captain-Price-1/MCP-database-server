import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Test the corrected query with actual column name
 */
async function testCorrectedQuery() {
  console.log('🧪 Testing Query with Correct Column Name');
  console.log('==========================================');
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

    //Test with the CORRECT column name
    console.log('🔍 Test: Find quiet times with CORRECT column name (requested_time)');
    console.log('─'.repeat(70));
    
    const correctSQL = 'SELECT HOUR(requested_time) AS hour, COUNT(*) AS count FROM reservations GROUP BY hour ORDER BY count ASC LIMIT 5';
    console.log(`SQL: ${correctSQL}`);
    console.log();
    
    const result = await databaseService.executeSQL(correctSQL, true);
    
    if (result.results && result.results.rows && result.results.rows.length > 0) {
      console.log(`✅ SUCCESS! Found ${result.results.rows.length} quiet hours:`);
      result.results.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Hour ${row.hour}:00 - ${row.count} reservations`);
      });
    } else {
      console.log(`⚠️  No results`);
    }
    console.log();

    // Test with the WRONG column name (what OpenAI guessed)
    console.log('❌ Test: Try with WRONG column name (reservation_time)');
    console.log('─'.repeat(70));
    
    const wrongSQL = 'SELECT HOUR(reservation_time) AS hour, COUNT(*) AS count FROM reservations GROUP BY hour ORDER BY count ASC LIMIT 5';
    console.log(`SQL: ${wrongSQL}`);
    console.log();
    
    try {
      const result2 = await databaseService.executeSQL(wrongSQL, true);
      console.log(`Result:`, result2);
    } catch (error) {
      console.log(`❌ As expected, this fails: ${error.message}`);
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('💡 Conclusion:');
    console.log('   - The semantic SQL generation is CORRECT (using HOUR, GROUP BY, COUNT)');
    console.log('   - The problem is OpenAI guessed "reservation_time" instead of "requested_time"');
    console.log('   - This happens because schema loading is failing (describe_table error)');
    console.log();
    console.log('🔧 Solution needed:');
    console.log('   - Fix the describe_table tool to properly return column information');
    console.log('   - OR manually provide schema context to OpenAI');
    console.log('   - Once schema loads correctly, OpenAI will use the right column names');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCorrectedQuery();
