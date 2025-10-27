import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Diagnostic script to test table creation, listing, and inserting records
 */
async function diagnosticTest() {
  console.log('🔍 Diagnostic Test - Laravel Database Operations');
  console.log('================================================');
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

    console.log('✅ Connected to database');
    console.log();

    // Test 1: List existing tables (direct SQL)
    console.log('📋 Test 1: List tables using direct SQL');
    try {
      const sqlResult = await databaseService.executeSQL('SHOW TABLES', true);
      console.log('   Raw result:', JSON.stringify(sqlResult, null, 2));
      
      if (sqlResult.results && sqlResult.results.rows) {
        console.log(`   ✅ Found ${sqlResult.results.rows.length} tables`);
        sqlResult.results.rows.forEach((row, index) => {
          const tableName = Object.values(row)[0]; // Get the first value from the row
          console.log(`   ${index + 1}. ${tableName}`);
        });
      } else {
        console.log('   ⚠️  No rows returned');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 2: List tables using MCP tool
    console.log('📋 Test 2: List tables using MCP tool');
    try {
      const toolResult = await databaseService.listTables();
      console.log('   Raw result:', JSON.stringify(toolResult, null, 2));
      
      if (toolResult.tables && toolResult.tables.length > 0) {
        console.log(`   ✅ Found ${toolResult.tables.length} tables`);
        toolResult.tables.forEach((table, index) => {
          console.log(`   ${index + 1}. ${table.name}`);
        });
      } else {
        console.log('   ⚠️  No tables found');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 3: Create a test table
    console.log('🔧 Test 3: Create a test table');
    const testTableName = 'mcp_test_' + Date.now();
    try {
      const createSQL = `CREATE TABLE ${testTableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      const createResult = await databaseService.executeSQL(createSQL, false);
      console.log(`   ✅ Table "${testTableName}" created successfully`);
      console.log('   Result:', JSON.stringify(createResult, null, 2));
    } catch (error) {
      console.log(`   ❌ Error creating table: ${error.message}`);
    }
    console.log();

    // Test 4: Verify table was created
    console.log('📋 Test 4: Verify table exists');
    try {
      const verifySQL = `SHOW TABLES LIKE '${testTableName}'`;
      const verifyResult = await databaseService.executeSQL(verifySQL, true);
      console.log('   Result:', JSON.stringify(verifyResult, null, 2));
      
      if (verifyResult.results && verifyResult.results.rows && verifyResult.results.rows.length > 0) {
        console.log(`   ✅ Table "${testTableName}" exists`);
      } else {
        console.log(`   ⚠️  Table "${testTableName}" not found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 5: Insert data
    console.log('📝 Test 5: Insert test data');
    try {
      const insertSQL = `INSERT INTO ${testTableName} (name, email) VALUES ('Test User', 'test@example.com')`;
      const insertResult = await databaseService.executeSQL(insertSQL, false);
      console.log('   ✅ Record inserted successfully');
      console.log('   Result:', JSON.stringify(insertResult, null, 2));
    } catch (error) {
      console.log(`   ❌ Error inserting data: ${error.message}`);
    }
    console.log();

    // Test 6: Query the data
    console.log('🔍 Test 6: Query the test data');
    try {
      const selectSQL = `SELECT * FROM ${testTableName}`;
      const selectResult = await databaseService.executeSQL(selectSQL, true);
      console.log('   Result:', JSON.stringify(selectResult, null, 2));
      
      if (selectResult.results && selectResult.results.rows && selectResult.results.rows.length > 0) {
        console.log(`   ✅ Found ${selectResult.results.rows.length} record(s)`);
        selectResult.results.rows.forEach((row, index) => {
          console.log(`   Record ${index + 1}:`, row);
        });
      } else {
        console.log('   ⚠️  No records found');
      }
    } catch (error) {
      console.log(`   ❌ Error querying data: ${error.message}`);
    }
    console.log();

    // Test 7: Count records
    console.log('🔢 Test 7: Count records');
    try {
      const countSQL = `SELECT COUNT(*) as total FROM ${testTableName}`;
      const countResult = await databaseService.executeSQL(countSQL, true);
      console.log('   Result:', JSON.stringify(countResult, null, 2));
      
      if (countResult.results && countResult.results.rows && countResult.results.rows.length > 0) {
        const count = countResult.results.rows[0].total;
        console.log(`   ✅ Total records: ${count}`);
      }
    } catch (error) {
      console.log(`   ❌ Error counting: ${error.message}`);
    }
    console.log();

    // Test 8: Clean up - drop test table
    console.log('🗑️  Test 8: Clean up test table');
    try {
      const dropSQL = `DROP TABLE IF EXISTS ${testTableName}`;
      await databaseService.executeSQL(dropSQL, false);
      console.log(`   ✅ Test table "${testTableName}" dropped`);
    } catch (error) {
      console.log(`   ⚠️  Could not drop test table: ${error.message}`);
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('🎉 Diagnostic test completed!');
    console.log();
    console.log('💡 Summary:');
    console.log('   If all tests passed, your database operations are working correctly.');
    console.log('   If some tests failed, check the error messages above.');

  } catch (error) {
    console.error('❌ Diagnostic test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnostic test
diagnosticTest();
