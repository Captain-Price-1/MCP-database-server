import { MCPClient } from './mcpClient.js';
import { OpenAIService } from './openaiService.js';

/**
 * Database Service that combines MCP client and OpenAI service
 * Provides high-level database operations with natural language support
 */
export class DatabaseService {
  constructor(config) {
    this.config = config;
    this.mcpClient = null;
    this.openaiService = null;
    this.databaseSchema = null;
    this.isConnected = false;
  }

  /**
   * Initialize the database service
   */
  async initialize() {
    try {
      // Initialize OpenAI service
      this.openaiService = new OpenAIService(
        this.config.openai.apiKey,
        this.config.openai.model
      );

      // Build MCP server arguments based on database type
      const serverArgs = this.buildServerArgs();
      
      // Initialize MCP client
      this.mcpClient = new MCPClient(
        this.config.mcp.serverPath,
        serverArgs
      );

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to MCP server
      await this.mcpClient.connect();

      // Load database schema
      await this.loadDatabaseSchema();

      this.isConnected = true;
      console.log('✅ Database service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Build MCP server arguments based on configuration
   */
  buildServerArgs() {
    const { database } = this.config;
    
    switch (database.type) {
      case 'sqlite':
        return [database.path];
        
      case 'postgresql':
        const pgArgs = ['--postgresql', '--host', database.host, '--database', database.name];
        if (database.user) pgArgs.push('--user', database.user);
        if (database.password) pgArgs.push('--password', database.password);
        if (database.port) pgArgs.push('--port', database.port.toString());
        if (database.ssl) pgArgs.push('--ssl', database.ssl.toString());
        return pgArgs;
        
      case 'mysql':
        const mysqlArgs = ['--mysql', '--host', database.host, '--database', database.name];
        if (database.user) mysqlArgs.push('--user', database.user);
        if (database.password) mysqlArgs.push('--password', database.password);
        if (database.port) mysqlArgs.push('--port', database.port.toString());
        if (database.ssl) mysqlArgs.push('--ssl', database.ssl.toString());
        if (database.awsIamAuth) {
          mysqlArgs.push('--aws-iam-auth');
          if (database.awsRegion) mysqlArgs.push('--aws-region', database.awsRegion);
        }
        return mysqlArgs;
        
      case 'sqlserver':
        const sqlArgs = ['--sqlserver', '--server', database.server, '--database', database.name];
        if (database.user) sqlArgs.push('--user', database.user);
        if (database.password) sqlArgs.push('--password', database.password);
        if (database.port) sqlArgs.push('--port', database.port.toString());
        return sqlArgs;
        
      default:
        throw new Error(`Unsupported database type: ${database.type}`);
    }
  }

  /**
   * Set up event handlers for MCP client
   */
  setupEventHandlers() {
    this.mcpClient.on('connected', () => {
      console.log('🔌 MCP client connected');
    });

    this.mcpClient.on('disconnected', () => {
      console.log('🔌 MCP client disconnected');
      this.isConnected = false;
    });

    this.mcpClient.on('error', (error) => {
      console.error('MCP client error:', error);
    });
  }

  /**
   * Load database schema for better SQL generation
   */
  async loadDatabaseSchema() {
    try {
      // Get list of tables
      const tablesResponse = await this.mcpClient.callTool('list_tables');
      
      // Parse the response to get table names
      let tables = [];
      if (tablesResponse && tablesResponse.content && Array.isArray(tablesResponse.content)) {
        const textContent = tablesResponse.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            const tableNames = JSON.parse(textContent.text);
            tables = tableNames.map(name => ({ name }));
          } catch (parseError) {
            console.warn('Could not parse table list');
          }
        }
      } else if (tablesResponse.tables) {
        tables = tablesResponse.tables;
      }

      let schema = '=== DATABASE SCHEMA ===\n\n';
      
      for (const table of tables) {
        try {
          // Try to get schema from describe_table first
          const tableInfo = await this.mcpClient.callTool('describe_table', { table: table.name });
          
          // Parse column information
          let columns = [];
          if (tableInfo && tableInfo.content && Array.isArray(tableInfo.content)) {
            const textContent = tableInfo.content.find(c => c.type === 'text');
            if (textContent && textContent.text) {
              try {
                const parsed = JSON.parse(textContent.text);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                columns = parsed;
              } catch (parseError) {
                // Fallback: Get schema from sample data
                try {
                  const sampleQuery = `SELECT * FROM ${table.name} LIMIT 1`;
                  const sampleResult = await this.mcpClient.callTool('read_query', { query: sampleQuery });
                  
                  if (sampleResult && sampleResult.content && Array.isArray(sampleResult.content)) {
                    const sampleText = sampleResult.content.find(c => c.type === 'text');
                    if (sampleText && sampleText.text) {
                      const sampleData = JSON.parse(sampleText.text);
                      if (Array.isArray(sampleData) && sampleData.length > 0) {
                        // Extract column names and types from sample data
                        columns = Object.keys(sampleData[0]).map(key => ({
                          name: key,
                          type: typeof sampleData[0][key] === 'number' ? 'number' : 
                                typeof sampleData[0][key] === 'string' ? 'varchar' : 'unknown'
                        }));
                      }
                    }
                  }
                } catch (fallbackError) {
                  console.warn(`Could not get schema from sample data for ${table.name}`);
                }
              }
            }
          } else if (tableInfo.columns) {
            columns = tableInfo.columns;
          }
          
          schema += `Table: ${table.name}\n`;
          
          if (Array.isArray(columns) && columns.length > 0) {
            schema += 'Columns:\n';
            columns.forEach(col => {
              schema += `  - ${col.name || col.Field} (${col.type || col.Type || 'unknown'})`;
              if (col.key || col.Key) schema += ` [${col.key || col.Key}]`;
              if (col.nullable === 'NO' || col.Null === 'NO') schema += ` NOT NULL`;
              schema += '\n';
            });
            
            // Add context hints for common column patterns
            const columnNames = columns.map(c => (c.name || c.Field || '').toLowerCase());
            if (columnNames.some(n => n.includes('time') || n.includes('date') || n.includes('created') || n.includes('updated'))) {
              schema += 'Note: This table has time-based columns - use for temporal analysis\n';
            }
            if (columnNames.some(n => n.includes('price') || n.includes('amount') || n.includes('cost') || n.includes('total') || n.includes('fee'))) {
              schema += 'Note: This table has numeric/monetary columns - use for aggregations (SUM, AVG)\n';
            }
            if (columnNames.some(n => n.includes('status') || n.includes('type') || n.includes('category'))) {
              schema += 'Note: This table has categorical columns - use for GROUP BY analysis\n';
            }
          } else {
            schema += 'Columns: (could not load)\n';
          }
          
          schema += '\n';
        } catch (error) {
          console.warn(`Could not describe table ${table.name}:`, error.message);
          schema += `Table: ${table.name}\nColumns: (error loading)\n\n`;
        }
      }
      
      schema += '\n=== ANALYSIS TIPS ===\n';
      schema += '- For "quiet/busy times" → GROUP BY time periods, COUNT activities, ORDER BY count\n';
      schema += '- For "top/bottom" queries → ORDER BY metric DESC/ASC, LIMIT N\n';
      schema += '- For "trends" → GROUP BY date/time periods with aggregations\n';
      schema += '- For "popular/frequent" → GROUP BY entity, COUNT, ORDER BY count DESC\n';

      this.databaseSchema = schema;
      console.log('📋 Database schema loaded');
      
      // Debug: Show schema being sent to OpenAI
      if (process.env.DEBUG_SCHEMA === 'true') {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 DEBUG: Schema that will be sent to OpenAI:');
        console.log('='.repeat(80));
        console.log(schema);
        console.log('='.repeat(80) + '\n');
      }

    } catch (error) {
      console.warn('Could not load database schema:', error.message);
      this.databaseSchema = null;
    }
  }

  /**
   * Process natural language query
   */
  async processNaturalLanguageQuery(query) {
    if (!this.isConnected) {
      throw new Error('Database service not connected');
    }

    try {
      console.log(`🤖 Processing: "${query}"`);
      
      // Get available tools
      const availableTools = this.mcpClient.getAvailableTools();
      
      // Convert natural language to SQL using OpenAI
      const conversion = await this.openaiService.convertToSQL(
        query,
        this.databaseSchema,
        availableTools
      );

      console.log(`📝 Generated ${conversion.tool} with confidence: ${conversion.confidence}`);
      console.log(`💡 Explanation: ${conversion.explanation}`);

      // Validate SQL if it's a query
      if (conversion.arguments.query) {
        const validation = await this.openaiService.validateSQL(conversion.arguments.query);
        if (!validation.safe) {
          console.warn(`⚠️ SQL validation warning: ${validation.analysis}`);
        }
      }

      // Execute the tool
      let result = await this.mcpClient.callTool(conversion.tool, conversion.arguments);

      // Parse the result based on the tool used
      let parsedResult = result;
      
      // Handle list_tables specially
      if (conversion.tool === 'list_tables') {
        if (result && result.content && Array.isArray(result.content)) {
          const textContent = result.content.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            try {
              const tableNames = JSON.parse(textContent.text);
              // Convert to rows format for display
              parsedResult = {
                rows: tableNames.map(name => ({ table_name: name }))
              };
            } catch (parseError) {
              console.warn('Could not parse list_tables result');
            }
          }
        }
      }
      // Handle read_query and write_query
      else if (result && result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            const data = JSON.parse(textContent.text);
            if (Array.isArray(data)) {
              parsedResult = { rows: data };
            } else if (data.affected_rows !== undefined) {
              parsedResult = { rows: [data] };
            } else if (data.error) {
              parsedResult = { error: data.error, rows: [] };
            }
          } catch (parseError) {
            console.warn('Could not parse query result');
          }
        }
      }

      // Generate explanation for results
      let explanation = null;
      let followUps = null;

      if (parsedResult.rows && parsedResult.rows.length > 0) {
        explanation = await this.openaiService.explainResults(
          conversion.arguments.query || conversion.tool,
          parsedResult.rows,
          query
        );
        
        followUps = await this.openaiService.suggestFollowUps(query, parsedResult.rows);
      }

      return {
        originalQuery: query,
        tool: conversion.tool,
        sql: conversion.arguments.query,
        results: parsedResult,
        explanation: explanation,
        followUps: followUps,
        confidence: conversion.confidence,
        validation: conversion.arguments.query ? await this.openaiService.validateSQL(conversion.arguments.query) : null
      };

    } catch (error) {
      console.error('Error processing natural language query:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   */
  async executeSQL(sqlQuery, isReadOnly = true) {
    if (!this.isConnected) {
      throw new Error('Database service not connected');
    }

    try {
      const tool = isReadOnly ? 'read_query' : 'write_query';
      const result = await this.mcpClient.callTool(tool, { query: sqlQuery });
      
      // Parse the MCP response format
      let parsedResult = result;
      if (result && result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            const data = JSON.parse(textContent.text);
            parsedResult = { rows: data, isError: result.isError };
          } catch (parseError) {
            // If parsing fails, keep original result
            parsedResult = result;
          }
        }
      }
      
      return {
        sql: sqlQuery,
        results: parsedResult,
        tool: tool
      };

    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  }

  /**
   * List all tables
   */
  async listTables() {
    if (!this.isConnected) {
      throw new Error('Database service not connected');
    }

    try {
      const result = await this.mcpClient.callTool('list_tables');
      
      // Parse the MCP response format
      if (result && result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            const tableNames = JSON.parse(textContent.text);
            // Convert array of names to array of objects with 'name' property
            const tables = tableNames.map(name => ({ name }));
            return { tables };
          } catch (parseError) {
            console.warn('Could not parse table list:', parseError);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error listing tables:', error);
      throw error;
    }
  }

  /**
   * Describe table structure
   */
  async describeTable(tableName) {
    if (!this.isConnected) {
      throw new Error('Database service not connected');
    }

    try {
      const result = await this.mcpClient.callTool('describe_table', { table: tableName });
      return result;
    } catch (error) {
      console.error('Error describing table:', error);
      throw error;
    }
  }

  /**
   * List available databases (for multi-database systems)
   */
  async listDatabases() {
    if (!this.isConnected) {
      throw new Error('Database service not connected');
    }

    try {
      const result = await this.mcpClient.callTool('list_databases');
      return result;
    } catch (error) {
      console.error('Error listing databases:', error);
      throw error;
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    return this.mcpClient ? this.mcpClient.getAvailableTools() : [];
  }

  /**
   * Get available resources
   */
  getAvailableResources() {
    return this.mcpClient ? this.mcpClient.getAvailableResources() : [];
  }

  /**
   * Check if service is connected
   */
  isServiceConnected() {
    return this.isConnected && this.mcpClient && this.mcpClient.isClientConnected();
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
    }
    this.isConnected = false;
    console.log('🔌 Database service disconnected');
  }
}
