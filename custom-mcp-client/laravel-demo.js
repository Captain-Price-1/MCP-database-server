import dotenv from 'dotenv';
import { DatabaseService } from './src/databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Laravel Database Demo - Show what's in your Laravel database
 */
async function laravelDemo() {
  console.log('🚀 Laravel Database Demo');
  console.log('========================');
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

    console.log(`📊 Connected to Laravel database: ${config.database.name}`);
    console.log(`🏠 Host: ${config.database.host}:${config.database.port}`);
    console.log();

    // Initialize database service
    const databaseService = new DatabaseService(config);
    await databaseService.initialize();

    console.log('✅ Connected to your Laravel database!');
    console.log();

    // Show all tables
    console.log('📋 Laravel Database Tables:');
    console.log('─'.repeat(40));
    
    const tablesResult = await databaseService.listTables();
    if (tablesResult.tables && tablesResult.tables.length > 0) {
      tablesResult.tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.name}`);
      });
      
      console.log();
      console.log(`Found ${tablesResult.tables.length} tables in your Laravel database`);
      
      // Show structure of first table
      if (tablesResult.tables.length > 0) {
        const firstTable = tablesResult.tables[0];
        console.log();
        console.log(`🔍 Structure of "${firstTable.name}" table:`);
        console.log('─'.repeat(40));
        
        try {
          const tableInfo = await databaseService.describeTable(firstTable.name);
          if (tableInfo.columns) {
            tableInfo.columns.forEach(col => {
              console.log(`   • ${col.name} (${col.type})`);
            });
          }
        } catch (error) {
          console.log(`   Could not describe table: ${error.message}`);
        }
      }
      
    } else {
      console.log('No tables found in your Laravel database');
      console.log('💡 This might be a fresh Laravel installation');
      console.log('   Try running: php artisan migrate');
    }

    console.log();
    console.log('💬 Example queries you can try:');
    console.log('   • "Show me all tables"');
    console.log('   • "What is the structure of the users table?"');
    console.log('   • "How many records are in each table?"');
    console.log('   • "Create a sample users table"');
    console.log('   • "Insert some test data"');
    console.log();

    // Cleanup
    await databaseService.disconnect();
    console.log('🎉 Demo completed! Your MCP client is ready to query your Laravel database!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log();
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure your Laravel database is running');
    console.log('   2. Check that MySQL is accessible on 127.0.0.1:3306');
    console.log('   3. Verify your database credentials in .env');
    console.log('   4. Try running: php artisan migrate (if no tables exist)');
  }
}

// Run the demo
laravelDemo();
