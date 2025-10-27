import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Correct way to work with Laravel database using MCP tools
 */
async function correctUsageDemo() {
  console.log('✅ Correct Usage Demo - MCP Tools');
  console.log('==================================');
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

    console.log('✅ Connected to Laravel database');
    console.log();

    // ✅ CORRECT: List tables using MCP tool
    console.log('📋 Step 1: List all tables (using list_tables tool)');
    const tablesResult = await databaseService.listTables();
    
    if (tablesResult.tables && tablesResult.tables.length > 0) {
      console.log(`   ✅ Found ${tablesResult.tables.length} tables:`);
      tablesResult.tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name}`);
      });
    } else {
      console.log('   No tables found');
    }
    console.log();

    // ✅ CORRECT: Query data from existing table
    if (tablesResult.tables && tablesResult.tables.length > 0) {
      const firstTable = tablesResult.tables[0].name;
      
      console.log(`📊 Step 2: Query data from "${firstTable}" table`);
      try {
        // Use read_query with SELECT statement
        const selectResult = await databaseService.mcpClient.callTool('read_query', {
          query: `SELECT * FROM ${firstTable} LIMIT 5`
        });
        
        console.log(`   ✅ Query successful!`);
        console.log('   Result:', JSON.stringify(selectResult, null, 2));
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
      console.log();

      // ✅ CORRECT: Count records in table
      console.log(`🔢 Step 3: Count records in "${firstTable}"`);
      try {
        const countResult = await databaseService.mcpClient.callTool('read_query', {
          query: `SELECT COUNT(*) as total FROM ${firstTable}`
        });
        
        console.log(`   ✅ Count successful!`);
        console.log('   Result:', JSON.stringify(countResult, null, 2));
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
      console.log();

      // ✅ CORRECT: Describe table structure
      console.log(`🔍 Step 4: Describe "${firstTable}" structure`);
      try {
        const describeResult = await databaseService.describeTable(firstTable);
        
        console.log(`   ✅ Table structure:`);
        if (describeResult.columns) {
          describeResult.columns.forEach(col => {
            console.log(`      • ${col.name} (${col.type})`);
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
      console.log();
    }

    // ✅ CORRECT: Insert data into existing table
    console.log('📝 Step 5: Insert test data');
    console.log('   Note: Make sure you have a table to insert into!');
    
    // Check if 'users' table exists
    const hasUsersTable = tablesResult.tables && tablesResult.tables.some(t => t.name === 'users');
    
    if (hasUsersTable) {
      console.log('   Found "users" table - attempting insert...');
      try {
        const insertResult = await databaseService.mcpClient.callTool('write_query', {
          query: `INSERT INTO users (name, email, password, created_at, updated_at) 
                  VALUES ('MCP Test User', 'mcp-test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW())`
        });
        
        console.log(`   ✅ Insert successful!`);
        console.log('   Result:', JSON.stringify(insertResult, null, 2));
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No "users" table found. You can create one first.');
    }
    console.log();

    // Cleanup
    await databaseService.disconnect();
    
    console.log('🎉 Demo completed!');
    console.log();
    console.log('💡 Key Takeaways:');
    console.log('   ✅ Use list_tables tool to list tables');
    console.log('   ✅ Use read_query tool with SELECT statements');
    console.log('   ✅ Use write_query tool with INSERT/UPDATE/DELETE');
    console.log('   ✅ Use create_table tool to create tables');
    console.log('   ✅ Use describe_table tool to see table structure');
    console.log();
    console.log('   ❌ Do NOT use SHOW TABLES (not supported)');
    console.log('   ❌ Do NOT use CREATE TABLE in write_query');
    console.log('   ❌ Do NOT use SELECT in write_query');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
correctUsageDemo();
