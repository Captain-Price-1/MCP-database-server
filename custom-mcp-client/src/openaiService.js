import OpenAI from 'openai';

/**
 * OpenAI Service for natural language to SQL conversion
 * and database interaction assistance
 */
export class OpenAIService {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.client = new OpenAI({
      apiKey: apiKey
    });
    this.model = model;
  }

  /**
   * Convert natural language query to SQL
   */
  async convertToSQL(naturalLanguageQuery, databaseSchema = null, availableTools = []) {
    try {
      const systemPrompt = this.buildSystemPrompt(databaseSchema, availableTools);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: naturalLanguageQuery
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      
      // Parse the response to extract SQL and tool information
      return this.parseResponse(content);
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to convert to SQL: ${error.message}`);
    }
  }

  /**
   * Build system prompt for SQL conversion
   */
  buildSystemPrompt(databaseSchema, availableTools) {
    let prompt = `You are an intelligent database analyst that understands business questions and converts them into analytical SQL queries.

CRITICAL: Think semantically, not literally. When users ask analytical questions, generate queries that ANALYZE data, not just retrieve it.

Available MCP Database Tools:
${availableTools.map(tool => `- ${tool.name}: ${tool.description || 'No description available'}`).join('\n')}

SEMANTIC QUERY UNDERSTANDING:
When users ask questions like:
- "What are the quiet times?" → Analyze time periods with LOW activity (use GROUP BY time, COUNT, ORDER BY ASC)
- "What are the peak hours?" → Analyze time periods with HIGH activity (use GROUP BY time, COUNT, ORDER BY DESC)
- "What are the trends?" → Analyze patterns over time (use DATE functions, GROUP BY, aggregations)
- "Who are the top customers?" → Rank by metrics (use ORDER BY, LIMIT)
- "What's popular?" → Count frequency (use GROUP BY, COUNT, ORDER BY DESC)
- "Find patterns" → Use aggregations, GROUP BY, statistical functions

DO NOT just SELECT a column because it has a matching name. Instead:
1. Understand the INTENT behind the question
2. Determine what ANALYSIS is needed
3. Generate SQL that COMPUTES the answer
4. Use aggregations (COUNT, SUM, AVG, MIN, MAX) when finding patterns
5. Use GROUP BY for categorical analysis
6. Use ORDER BY to rank results
7. Use LIMIT to focus on top/bottom results

Return your response in JSON format:
{
  "tool": "tool_name",
  "arguments": {
    "query": "SQL query here",
    "other_params": "value"
  },
  "explanation": "Brief explanation of what this query does",
  "confidence": 0.95
}

Tool Selection Guidelines:
- Use "read_query" for SELECT statements (most analytical queries)
- Use "write_query" for INSERT, UPDATE, DELETE statements
- Use "list_tables" to show all tables
- Use "describe_table" to show table structure
- Use "list_databases" to show available databases

SQL Best Practices:
- Use MySQL syntax (your database is MySQL)
- For time-based analysis: Use HOUR(), DATE(), DAYOFWEEK(), etc.
- For ranking: Use ORDER BY with LIMIT
- For aggregations: Use GROUP BY with COUNT, SUM, AVG, etc.
- For top/bottom results: Use ORDER BY DESC/ASC with LIMIT
- Always include meaningful column aliases (AS)
- Add LIMIT to prevent huge result sets (default: LIMIT 20)
- Use proper WHERE clauses for filtering
- Consider adding ORDER BY for better readability

Example Transformations:
❌ BAD: "quiet times" → SELECT quiet_time FROM reservations
✅ GOOD: "quiet times" → SELECT HOUR(reservation_time) as hour, COUNT(*) as count FROM reservations GROUP BY hour ORDER BY count ASC LIMIT 5

❌ BAD: "popular products" → SELECT * FROM products WHERE popular = true
✅ GOOD: "popular products" → SELECT product_name, COUNT(*) as sales FROM orders GROUP BY product_name ORDER BY sales DESC LIMIT 10

❌ BAD: "top users" → SELECT * FROM users WHERE is_top = 1
✅ GOOD: "top users" → SELECT user_name, COUNT(*) as activity FROM user_actions GROUP BY user_name ORDER BY activity DESC LIMIT 10

Confidence Guidelines:
- 0.9-1.0: Very confident, clear query intent
- 0.7-0.9: Confident, minor ambiguity
- 0.5-0.7: Somewhat confident, some ambiguity
- 0.0-0.5: Low confidence, unclear intent`;

    if (databaseSchema) {
      prompt += `\n\nCurrent Database Schema:\n${databaseSchema}\n\nUse this schema to understand available tables and columns. Generate queries that work with these actual columns.`;
    }

    return prompt;
  }

  /**
   * Parse OpenAI response to extract structured data
   */
  parseResponse(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tool: parsed.tool,
          arguments: parsed.arguments,
          explanation: parsed.explanation,
          confidence: parsed.confidence || 0.8,
          rawResponse: content
        };
      }
      
      // Fallback: try to extract tool and query manually
      const toolMatch = content.match(/tool["\s]*:["\s]*([^,\n}]+)/i);
      const queryMatch = content.match(/query["\s]*:["\s]*["']([^"']+)["']/i);
      
      return {
        tool: toolMatch ? toolMatch[1].trim().replace(/['"]/g, '') : 'read_query',
        arguments: {
          query: queryMatch ? queryMatch[1] : content
        },
        explanation: 'Generated from natural language query',
        confidence: 0.7,
        rawResponse: content
      };
      
    } catch (error) {
      console.warn('Failed to parse OpenAI response as JSON:', error);
      
      // Fallback parsing
      return {
        tool: 'read_query',
        arguments: {
          query: content
        },
        explanation: 'Fallback parsing used',
        confidence: 0.5,
        rawResponse: content
      };
    }
  }

  /**
   * Get explanation for SQL query results
   */
  async explainResults(query, results, naturalLanguageQuery) {
    try {
      const prompt = `Explain the results of this SQL query in the context of the user's original question.

Original Question: ${naturalLanguageQuery}
SQL Query: ${query}
Results: ${JSON.stringify(results, null, 2)}

Provide a clear, concise explanation of what the results mean and how they answer the user's question.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0].message.content;
      
    } catch (error) {
      console.error('OpenAI explanation error:', error);
      return 'Unable to generate explanation for results.';
    }
  }

  /**
   * Suggest improvements or follow-up questions
   */
  async suggestFollowUps(naturalLanguageQuery, results) {
    try {
      const prompt = `Based on the user's question and the results, suggest 2-3 relevant follow-up questions or improvements.

Original Question: ${naturalLanguageQuery}
Results: ${JSON.stringify(results, null, 2)}

Suggest follow-up questions that would be helpful for the user.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content;
      
    } catch (error) {
      console.error('OpenAI follow-up suggestion error:', error);
      return null;
    }
  }

  /**
   * Validate SQL query for safety
   */
  async validateSQL(sqlQuery) {
    try {
      const prompt = `Analyze this SQL query for potential security issues and best practices.

SQL Query: ${sqlQuery}

Check for:
1. SQL injection vulnerabilities
2. Missing LIMIT clauses for large datasets
3. Proper WHERE clauses
4. Appropriate use of SELECT vs other operations

Respond with "SAFE" if the query is safe, or "UNSAFE" with explanation if there are concerns.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      return {
        safe: content.includes('SAFE'),
        analysis: content,
        recommendation: content.includes('UNSAFE') ? 'Review query before execution' : 'Query appears safe'
      };
      
    } catch (error) {
      console.error('OpenAI SQL validation error:', error);
      return {
        safe: false,
        analysis: 'Unable to validate query',
        recommendation: 'Manual review recommended'
      };
    }
  }
}
