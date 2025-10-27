import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Diagnose the reservations table issue
 */
async function diagnoseReservations() {
  console.log('🔍 Diagnosing Reservations Table');
  console.log('=================================');
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

    // Step 1: Check if reservations table exists
    console.log('📋 Step 1: List all tables');
    const tablesResult = await databaseService.listTables();
    
    if (tablesResult.tables) {
      const hasReservations = tablesResult.tables.some(t => t.name === 'reservations');
      console.log(`   Tables found: ${tablesResult.tables.length}`);
      console.log(`   Reservations table exists: ${hasReservations ? '✅ YES' : '❌ NO'}`);
      
      if (!hasReservations) {
        console.log('\n⚠️  The reservations table does not exist!');
        console.log('   Available tables:');
        tablesResult.tables.forEach(t => console.log(`      - ${t.name}`));
        await databaseService.disconnect();
        return;
      }
    }
    console.log();

    // Step 2: Describe the reservations table
    console.log('🔍 Step 2: Describe reservations table structure');
    try {
      const tableInfo = await databaseService.describeTable('reservations');
      
      // Try to parse the result
      let columns = [];
      if (tableInfo && tableInfo.content && Array.isArray(tableInfo.content)) {
        const textContent = tableInfo.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            columns = JSON.parse(textContent.text);
          } catch (e) {
            console.log('   Raw response:', textContent.text);
          }
        }
      }
      
      if (Array.isArray(columns) && columns.length > 0) {
        console.log(`   ✅ Found ${columns.length} columns:`);
        columns.forEach(col => {
          console.log(`      - ${col.name || col.Field} (${col.type || col.Type})`);
        });
        
        // Check for time-related columns
        const timeColumns = columns.filter(c => {
          const name = (c.name || c.Field || '').toLowerCase();
          return name.includes('time') || name.includes('date') || name.includes('created');
        });
        
        if (timeColumns.length > 0) {
          console.log(`\n   ⏰ Time-related columns found:`);
          timeColumns.forEach(col => {
            console.log(`      - ${col.name || col.Field}`);
          });
        } else {
          console.log(`\n   ⚠️  No time-related columns found!`);
          console.log(`      OpenAI assumed "reservation_time" exists, but it might have a different name.`);
        }
      } else {
        console.log('   ⚠️  Could not parse column information');
        console.log('   Raw result:', JSON.stringify(tableInfo, null, 2));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Step 3: Count rows in reservations
    console.log('🔢 Step 3: Count rows in reservations table');
    try {
      const countResult = await databaseService.executeSQL('SELECT COUNT(*) as total FROM reservations', true);
      
      if (countResult.results && countResult.results.rows) {
        const count = countResult.results.rows[0]?.total || 0;
        console.log(`   ✅ Total rows: ${count}`);
        
        if (count === 0) {
          console.log(`   ⚠️  The reservations table is EMPTY!`);
          console.log(`      This is why your query returned 0 rows.`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Step 4: Show sample data (if any)
    console.log('📊 Step 4: Show sample data from reservations');
    try {
      const sampleResult = await databaseService.executeSQL('SELECT * FROM reservations LIMIT 5', true);
      
      if (sampleResult.results && sampleResult.results.rows) {
        if (sampleResult.results.rows.length > 0) {
          console.log(`   ✅ Sample rows:`);
          sampleResult.results.rows.forEach((row, index) => {
            console.log(`   Row ${index + 1}:`, JSON.stringify(row));
          });
        } else {
          console.log(`   ⚠️  No data in table`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('💡 Summary:');
    console.log('   1. Check if reservations table has data');
    console.log('   2. Check if the time column has the correct name');
    console.log('   3. If empty, you need to insert sample data first');
    console.log('   4. If column name is different, OpenAI should adapt (once schema loads correctly)');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
diagnoseReservations();
