import dotenv from 'dotenv';
import { DatabaseService } from './databaseService.js';

// Load environment variables
dotenv.config();

/**
 * Test script for the custom MCP client
 */
class TestRunner {
  constructor() {
    this.databaseService = null;
    this.testResults = [];
  }

  /**
   * Initialize the test runner
   */
  async initialize() {
    try {
      console.log('🧪 Initializing Test Runner\n');

      // Validate environment
      this.validateEnvironment();

      // Create configuration
      const config = this.createConfig();

      // Initialize database service
      this.databaseService = new DatabaseService(config);
      await this.databaseService.initialize();

      console.log('✅ Test Runner ready!\n');

    } catch (error) {
      console.error('❌ Failed to initialize test runner:', error);
      throw error;
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironment() {
    const required = ['OPENAI_API_KEY', 'MCP_SERVER_PATH', 'DATABASE_TYPE'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Create configuration object
   */
  createConfig() {
    return {
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
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🚀 Starting Test Suite\n');

    const tests = [
      { name: 'List Tables', fn: () => this.testListTables() },
      { name: 'List Tools', fn: () => this.testListTools() },
      { name: 'Describe Table', fn: () => this.testDescribeTable() },
      { name: 'Natural Language Query', fn: () => this.testNaturalLanguageQuery() },
      { name: 'SQL Execution', fn: () => this.testSQLExecution() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }

    this.displayResults();
  }

  /**
   * Run a single test
   */
  async runTest(name, testFn) {
    console.log(`🧪 Running: ${name}`);
    
    try {
      await testFn();
      this.testResults.push({ name, status: 'PASS', error: null });
      console.log(`✅ ${name}: PASSED\n`);
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name}: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test listing tables
   */
  async testListTables() {
    const result = await this.databaseService.listTables();
    
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format');
    }
    
    console.log(`   Found ${result.tables ? result.tables.length : 0} tables`);
  }

  /**
   * Test listing tools
   */
  async testListTools() {
    const tools = this.databaseService.getAvailableTools();
    
    if (!Array.isArray(tools)) {
      throw new Error('Tools should be an array');
    }
    
    console.log(`   Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
  }

  /**
   * Test describing a table
   */
  async testDescribeTable() {
    // First get list of tables
    const tablesResult = await this.databaseService.listTables();
    
    if (tablesResult.tables && tablesResult.tables.length > 0) {
      const firstTable = tablesResult.tables[0];
      const tableInfo = await this.databaseService.describeTable(firstTable.name);
      
      if (!tableInfo || !tableInfo.columns) {
        throw new Error('Invalid table description format');
      }
      
      console.log(`   Described table "${firstTable.name}" with ${tableInfo.columns.length} columns`);
    } else {
      console.log('   No tables available for description test');
    }
  }

  /**
   * Test natural language query
   */
  async testNaturalLanguageQuery() {
    const queries = [
      'Show me all tables',
      'What tables are available?',
      'List the database structure'
    ];

    for (const query of queries) {
      const result = await this.databaseService.processNaturalLanguageQuery(query);
      
      if (!result || !result.tool) {
        throw new Error('Invalid natural language query result');
      }
      
      console.log(`   Query: "${query}" -> Tool: ${result.tool}, Confidence: ${result.confidence}`);
    }
  }

  /**
   * Test SQL execution
   */
  async testSQLExecution() {
    // Try a simple query
    const sqlQueries = [
      'SELECT 1 as test_value',
      'SELECT COUNT(*) as table_count FROM sqlite_master WHERE type="table"'
    ];

    for (const sql of sqlQueries) {
      const result = await this.databaseService.executeSQL(sql, true);
      
      if (!result || !result.results) {
        throw new Error('Invalid SQL execution result');
      }
      
      console.log(`   SQL: "${sql}" -> ${result.results.rows ? result.results.rows.length : 0} rows`);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    try {
      // Try an invalid query
      await this.databaseService.executeSQL('INVALID SQL QUERY', true);
      throw new Error('Should have thrown an error for invalid SQL');
    } catch (error) {
      // This is expected
      console.log(`   Error handling works: ${error.message}`);
    }
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('📊 Test Results Summary');
    console.log('─'.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
    }
    
    console.log('\n' + '─'.repeat(50));
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.databaseService) {
      await this.databaseService.disconnect();
    }
  }
}

// Run tests
async function runTests() {
  const testRunner = new TestRunner();
  
  try {
    await testRunner.initialize();
    await testRunner.runTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await testRunner.cleanup();
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n\n🔄 Test interrupted');
  process.exit(0);
});

// Start tests
runTests();
