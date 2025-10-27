import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Test semantic query understanding
 */
async function testSemanticQueries() {
  console.log('🧠 Testing Semantic Query Understanding');
  console.log('========================================');
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

    const testQueries = [
      {
        query: 'What are the quiet times in reservations?',
        expectedBehavior: 'Should analyze time periods with LOW activity, not just SELECT quiet_time column'
      },
      {
        query: 'What are the peak hours?',
        expectedBehavior: 'Should analyze time periods with HIGH activity using GROUP BY and COUNT'
      },
      {
        query: 'Who are the top users?',
        expectedBehavior: 'Should rank users by activity, not just SELECT users where is_top=1'
      },
      {
        query: 'What products are most popular?',
        expectedBehavior: 'Should count product frequency, not just SELECT popular products'
      }
    ];

    for (const test of testQueries) {
      console.log(`💬 Query: "${test.query}"`);
      console.log(`📌 Expected: ${test.expectedBehavior}`);
      console.log('─'.repeat(70));

      try {
        const result = await databaseService.processNaturalLanguageQuery(test.query);
        
        console.log(`🔧 Tool: ${result.tool}`);
        console.log(`📊 SQL Generated:`);
        console.log(`   ${result.sql || 'No SQL (non-query tool)'}`);
        console.log(`💡 Explanation: ${result.explanation || 'No explanation'}`);
        console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        
        // Check if it's using analytical SQL
        if (result.sql) {
          const isAnalytical = 
            result.sql.toUpperCase().includes('GROUP BY') ||
            result.sql.toUpperCase().includes('COUNT(') ||
            result.sql.toUpperCase().includes('SUM(') ||
            result.sql.toUpperCase().includes('AVG(') ||
            result.sql.toUpperCase().includes('HOUR(') ||
            result.sql.toUpperCase().includes('DATE(');
          
          if (isAnalytical) {
            console.log(`✅ GOOD: Query uses analytical SQL (GROUP BY, COUNT, etc.)`);
          } else {
            console.log(`⚠️  WARNING: Query might be too literal (no aggregations detected)`);
          }
        }
        
        console.log();
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log();
      }
    }

    // Cleanup
    await databaseService.disconnect();
    
    console.log('🎉 Semantic query test completed!');
    console.log();
    console.log('💡 Summary:');
    console.log('   If queries show GROUP BY, COUNT, aggregations → ✅ Working semantically');
    console.log('   If queries just SELECT columns literally → ❌ Still thinking literally');
    console.log();
    console.log('   Now try: npm start');
    console.log('   Then ask: "What are the quiet times in reservations?"');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSemanticQueries();
