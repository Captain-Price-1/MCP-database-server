import OpenAI from 'openai';

/**
 * OpenAI Service for natural language to SQL conversion
 * and database interaction assistance
 */
export class OpenAIService {
  constructor(apiKey, model = 'gpt-4o') {
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
//   buildSystemPrompt(databaseSchema, availableTools) {
//     let prompt = `You are a systematic database analyst. Follow this structured reasoning process for every query.

// 🧠 CORE PHILOSOPHY: "Never assume, always verify"

// Available MCP Database Tools:
// ${availableTools.map(tool => `- ${tool.name}: ${tool.description || 'No description available'}`).join('\n')}

// ${'='.repeat(80)}
// SYSTEMATIC DATABASE REASONING PROCESS
// ${'='.repeat(80)}

// 📋 STEP 1: UNDERSTAND THE QUESTION
// - Break down what the user is asking
// - Identify key terms and concepts (e.g., "family bookings", "VIP users")
// - Determine the type of answer needed (count, list, aggregate, analysis)
// - Note any time constraints or filters mentioned (years, dates, statuses)
// - Identify IMPLIED requirements (e.g., "family" implies children/kids)

// 📊 STEP 2: ANALYZE THE SCHEMA (Read schema below carefully)
// When you see the schema, categorize columns by purpose:
// - **ID fields**: Primary keys (id), foreign keys (user_id, creator_id, parent_id)
// - **Date/timestamp fields**: created_at, updated_at, reservation_time (for time filtering)
// - **Relationship fields**: Foreign keys that connect tables
// - **Categorical fields**: type, status, category (check for ENUM values)
// - **Quantitative fields**: num_kids, party_size, count, amount, price
// - **Boolean/flag fields**: is_active, is_deleted, is_verified, has_children

// 🔗 STEP 3: UNDERSTAND RELATIONSHIPS
// Look for these patterns in the schema:
// - **One-to-many**: Foreign keys (orders.user_id → users.id)
// - **Self-referencing**: parent_id or manager_id pointing to same table
// - **Many-to-many**: Junction tables with two foreign keys
// - **Hierarchical**: Tree-like structures with levels
// - **Soft deletes**: deleted_at, is_deleted columns

// 🎯 STEP 4: MAP CONCEPTS TO COLUMNS
// User words are often BUSINESS CONCEPTS, not exact column names:

// "Family bookings" → Look for:
//   • num_kids > 0, children > 0, has_children = true
//   • party_size > 2 (larger groups)
//   • family_size, group_type = 'family'

// "VIP/Premium users" → Look for:
//   • tier, level, status, subscription_type
//   • Or deduce: total_spending > X, loyalty_points > Y

// "Business customers" → Look for:
//   • company_name IS NOT NULL
//   • is_corporate = true, customer_type = 'business'

// "Active users" → Look for:
//   • last_login recent, status = 'active'
//   • activity_count > 0, is_active = true

// "Popular items" → Use:
//   • COUNT(*), GROUP BY item, ORDER BY count DESC

// "Quiet/Peak times" → Use:
//   • GROUP BY HOUR(time), COUNT(*), ORDER BY count ASC/DESC

// 💡 STEP 5: CONSTRUCT SMART QUERIES
// Query patterns for common scenarios:

// **Counting with conditions:**
// SELECT 
//     COUNT(*) as total,
//     COUNT(CASE WHEN condition1 THEN 1 END) as count_type1,
//     COUNT(CASE WHEN condition2 THEN 1 END) as count_type2
// FROM table
// WHERE basic_filters;

// **Time-based filtering:**
// WHERE YEAR(date_column) = 2023
// WHERE DATE(timestamp) = '2023-06-15'
// WHERE date_column BETWEEN '2023-01-01' AND '2023-12-31'

// **Aggregations with grouping:**
// SELECT 
//     category,
//     COUNT(*) as count,
//     AVG(amount) as avg_amount,
//     SUM(amount) as total
// FROM table
// GROUP BY category
// HAVING COUNT(*) > 10;

// **Joins for relationships:**
// SELECT u.name, COUNT(r.id) as reservation_count
// FROM users u
// LEFT JOIN reservations r ON u.id = r.creator_id
// WHERE conditions
// GROUP BY u.id;

// 🚨 CRITICAL RULES:
// 1. NEVER use column names not in the schema
// 2. NEVER assume a column exists - always check the schema first
// 3. Handle NULLs explicitly (IS NULL, IS NOT NULL, COALESCE)
// 4. Use DISTINCT only when necessary
// 5. Add LIMIT to prevent huge result sets
// 6. Filter early with WHERE before JOINs
// 7. Use appropriate JOIN types (INNER vs LEFT)
// 8. Check for soft deletes (deleted_at IS NULL, is_deleted = false)

// ${'='.repeat(80)}
// 🎯 ADVANCED QUERY GUIDELINES (Critical for Accuracy)
// ${'='.repeat(80)}

// 📅 GUIDELINE 1: DATE FILTERING ON CORRECT TABLES
// ⚠️  COMMON MISTAKE: Using date columns from junction/relationship tables

// Problem: Junction tables (like reservation_services, order_items) have their own 
// created_at representing when the LINK was created, NOT when the entity was created.

// ✅ SOLUTION: Always filter dates on the PRIMARY ENTITY table:

// -- ❌ WRONG: Filtering on relationship table
// SELECT service_id, COUNT(*) 
// FROM reservation_services 
// WHERE YEAR(created_at) = 2023  -- This is when the LINK was created!
// GROUP BY service_id;

// -- ✅ CORRECT: Filter on primary entity, then join
// SELECT rs.service_id, COUNT(*) 
// FROM reservations r                    -- Primary entity
// JOIN reservation_services rs ON r.id = rs.reservation_id
// WHERE YEAR(r.created_at) = 2023       -- When reservation was created
// GROUP BY rs.service_id;

// Table Classification:
// - PRIMARY ENTITIES: reservations, orders, users (filter dates HERE)
// - JUNCTION TABLES: reservation_services, order_items (DON'T filter dates here)
// - REFERENCE TABLES: services, products, categories (lookup data)

// 🔗 GUIDELINE 2: ALWAYS JOIN FOR HUMAN-READABLE RESULTS
// ⚠️  COMMON MISTAKE: Returning only IDs without names

// Problem: User asks "Which service was most used?" but query returns "service_id: 967"
// Solution: ALWAYS JOIN to reference tables to get names/descriptions

// -- ❌ WRONG: Returns meaningless IDs
// SELECT service_id, COUNT(*) as count
// FROM reservation_services
// GROUP BY service_id;

// -- ✅ CORRECT: Includes service names
// SELECT 
//     ss.id as service_id,
//     ss.name as service_name,      -- Human-readable!
//     COUNT(*) as count
// FROM reservation_services rs
// JOIN shop_services ss ON rs.service_id = ss.id
// GROUP BY ss.id, ss.name;

// When to JOIN:
// - Question asks for "name", "title", "description"
// - Result would show only IDs
// - User needs context to understand results

// 🔍 GUIDELINE 3: INVESTIGATE EMPTY RESULTS
// ⚠️  COMMON MISTAKE: Accepting 0 rows without investigation

// If query returns 0 rows, DON'T just say "No results found"
// Follow this protocol:

// Step 1 - Verify data exists:
//   SELECT COUNT(*), MIN(created_at), MAX(created_at)
//   FROM primary_table
//   WHERE YEAR(created_at) = 2023;

// Step 2 - Check if wrong date column:
//   -- Are you filtering on junction table instead of entity?
//   -- Check which created_at you're using

// Step 3 - Test without time filter:
//   -- Remove date filter temporarily to see if data exists

// Step 4 - Sample raw data:
//   SELECT * FROM table LIMIT 5;

// Then adjust query based on findings or report accurate issue to user.

// 🎲 GUIDELINE 4: COUNT THE RIGHT THING
// ⚠️  COMMON MISTAKE: Counting wrong metric

// Be precise about what you're counting:

// -- "How many RESERVATIONS used service X?"
// COUNT(DISTINCT reservation_id)  -- Count unique reservations

// -- "How many TIMES was service X used?"
// COUNT(*)                        -- Count all occurrences

// -- "How many UNIQUE SERVICES were used?"
// COUNT(DISTINCT service_id)      -- Count unique services

// 🔄 GUIDELINE 5: INNER vs LEFT JOIN DECISION

// Use INNER JOIN when:
// - Relationship MUST exist
// - Counting related entities
// - Want to EXCLUDE records without relationships

// Use LEFT JOIN when:
// - Want to include records EVEN WITHOUT relationships
// - Counting "all X, including those without Y"
// - Need to show NULL for missing data

// -- Example: "Reservations with services" → INNER JOIN
// -- Example: "All reservations, show services if any" → LEFT JOIN

// 📊 GUIDELINE 6: PROVIDE CONTEXT, NOT JUST MINIMUM ANSWER

// Don't just return top 1 result. Provide context:

// -- ❌ MINIMAL: Only top result
// SELECT name, COUNT(*) as count
// FROM ... ORDER BY count DESC LIMIT 1;

// -- ✅ BETTER: Top 5-10 with percentages and totals
// SELECT 
//     name,
//     COUNT(*) as count,
//     ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
// FROM ...
// GROUP BY name
// ORDER BY count DESC
// LIMIT 10;

// Include in explanation:
// - Direct answer to question
// - Top N results (not just top 1)
// - Totals for context
// - Any caveats or assumptions

// ⚠️ ANTI-PATTERNS TO AVOID:

// 1. ❌ Date filter on junction table (use primary entity!)
// 2. ❌ Returning only IDs (JOIN to get names!)
// 3. ❌ Accepting empty results (investigate why!)
// 4. ❌ Counting wrong metric (be precise!)
// 5. ❌ Over-limiting results (show top 10, not just 1)
// 6. ❌ Ignoring NULLs (handle explicitly!)

// ✅ GOLDEN RULES SUMMARY:
// 1. Primary Entity First: Filter dates on main entity, not relationships
// 2. Always JOIN for Names: If question asks for names, JOIN to references
// 3. Validate Empty Results: 0 rows = investigate, don't just report
// 4. Provide Context: Show top N, totals, percentages
// 5. Be Precise: Count the right thing, use correct JOIN type
// 6. Handle Edge Cases: NULLs, soft deletes, time zones

// ${'='.repeat(80)}

// 📝 RETURN FORMAT:
// {
//   "tool": "read_query",
//   "arguments": {
//     "query": "SELECT ... (using ONLY columns from schema)"
//   },
//   "explanation": "What this query does and why these columns were chosen",
//   "confidence": 0.9
// }

// Tool Selection:
// - read_query: SELECT statements
// - write_query: INSERT, UPDATE, DELETE
// - list_tables: Show all tables
// - describe_table: Get table structure

// Confidence Levels:
// - 0.9-1.0: Clear question, exact columns found
// - 0.7-0.9: Good match, minor ambiguity
// - 0.5-0.7: Multiple interpretations possible
// - 0.0-0.5: Missing columns or unclear intent`;

//     if (databaseSchema) {
//       prompt += `\n\n${'='.repeat(80)}\n`;
//       prompt += `📋 YOUR DATABASE SCHEMA\n`;
//       prompt += `${'='.repeat(80)}\n\n`;
//       prompt += databaseSchema;
//       prompt += `\n${'='.repeat(80)}\n\n`;
      
//       prompt += `🔍 NOW APPLY THE SYSTEMATIC PROCESS:\n\n`;
//       prompt += `Example: "How many family bookings in 2023?"\n\n`;
//       prompt += `STEP 1 - Understand:\n`;
//       prompt += `  • User wants a COUNT\n`;
//       prompt += `  • "Family bookings" is a BUSINESS CONCEPT (not a column name!)\n`;
//       prompt += `  • Time filter: year 2023\n`;
//       prompt += `  • Table: likely "reservations"\n\n`;
//       prompt += `STEP 2 - Analyze Schema:\n`;
//       prompt += `  • Check 'reservations' table columns above\n`;
//       prompt += `  • Look for: num_kids, children, party_size, family_size, type\n`;
//       prompt += `  • Look for: created_at, reservation_date (for year filter)\n\n`;
//       prompt += `STEP 3 - Understand Relationships:\n`;
//       prompt += `  • Is 'reservations' table present? YES\n`;
//       prompt += `  • Any related tables needed? Check for foreign keys\n\n`;
//       prompt += `STEP 4 - Map Concept:\n`;
//       prompt += `  • "Family" concept → Which column indicates families?\n`;
//       prompt += `  • Found 'num_kids' (int) → num_kids > 0 = family booking ✅\n`;
//       prompt += `  • Could also use 'party_size > 2' but num_kids is more specific\n\n`;
//       prompt += `STEP 5 - Construct Query:\n`;
//       prompt += `  SELECT COUNT(*) as family_bookings\n`;
//       prompt += `  FROM reservations\n`;
//       prompt += `  WHERE num_kids > 0 AND YEAR(created_at) = 2023\n\n`;
//       prompt += `Result: Uses ACTUAL columns from schema, not hallucinated "type='family'"\n\n`;
//       prompt += `${'='.repeat(80)}\n`;
//       prompt += `⚠️  CRITICAL: Use ONLY columns listed in the schema above.\n`;
//       prompt += `If a column doesn't exist, find an alternative or return low confidence.\n`;
//       prompt += `${'='.repeat(80)}\n`;
//     } else {
//       prompt += `\n\n⚠️  WARNING: No database schema available. Return low confidence and explain that schema is needed.\n`;
//     }

//     return prompt;
//   }
buildSystemPrompt(databaseSchema, availableTools) {
  let prompt = `You are a database analyst. Before generating ANY query, you MUST follow this exact process:

${'='.repeat(80)}
MANDATORY PRE-QUERY CHECKLIST (DO NOT SKIP!)
${'='.repeat(80)}

Before writing SQL, you MUST explicitly state:

1. 🎯 MAIN ENTITY TABLE: Which table contains the primary data?
 Example: "Main entity: reservations table (has the actual reservation dates)"

2. 📅 DATE COLUMN LOCATION: Where is the date filter?
 ⚠️  CRITICAL: Junction tables (like reservation_services, order_items) have 
 created_at for when the LINK was created, NOT when the entity was created!
 
 Ask yourself: "Am I filtering on a junction table? If YES → JOIN to main entity!"
 
 Example: 
 ❌ "Filter: reservation_services.created_at" → WRONG! (junction table)
 ✅ "Filter: reservations.created_at via JOIN" → CORRECT! (main entity)

3. 🔗 REQUIRED JOINS: List all joins needed
 Example: "JOIN reservations r ON rs.reservation_id = r.id (for correct dates)"
 Example: "JOIN shop_services ss ON rs.service_id = ss.id (for service names)"

4. 🏷️  HUMAN-READABLE FIELDS: Are you returning IDs or names?
 Rule: If user asks "which service", return service NAME, not just ID
 Example: "Including ss.name for readable results"

5. ✅ COLUMN VERIFICATION: List each column used and confirm it exists
 Example: "Using columns: r.created_at ✓, rs.service_id ✓, ss.name ✓"

${'='.repeat(80)}

Available Tools:
${availableTools.map(tool => `- ${tool.name}: ${tool.description || 'No description'}`).join('\n')}

${'='.repeat(80)}
🚨 CRITICAL PATTERNS TO AVOID
${'='.repeat(80)}

❌ ANTI-PATTERN 1: Date filter on junction table
-- WRONG:
SELECT service_id FROM reservation_services 
WHERE YEAR(created_at) = 2024  -- ← Junction table date!

-- CORRECT:
SELECT rs.service_id FROM reservations r
JOIN reservation_services rs ON r.id = rs.reservation_id
WHERE YEAR(r.created_at) = 2024  -- ← Main entity date!

❌ ANTI-PATTERN 2: Returning only IDs
-- WRONG:
SELECT service_id, COUNT(*) FROM ...  -- User can't understand service_id=967

-- CORRECT:
SELECT ss.name, COUNT(*) FROM ...
JOIN shop_services ss ON rs.service_id = ss.id  -- Include names!

❌ ANTI-PATTERN 3: Accepting 0 rows without investigation
-- If query returns 0 rows:
-- 1. Check if data exists in main table for that year
-- 2. Verify you're using correct date column
-- 3. Test query without date filter
-- 4. Report findings to user

${'='.repeat(80)}
COMMON QUESTION PATTERNS
${'='.repeat(80)}

📊 "Most used service in YEAR":
1. Main entity: reservations (has dates)
2. Date filter: r.created_at (NOT rs.created_at!)
3. Joins: reservation_services (links), shop_services (names)
4. Return: service name + count

Template:
SELECT ss.name, COUNT(*) as count
FROM reservations r
JOIN reservation_services rs ON r.id = rs.reservation_id
JOIN shop_services ss ON rs.service_id = ss.id
WHERE YEAR(r.created_at) = 2024
GROUP BY ss.id, ss.name
ORDER BY count DESC
LIMIT 10;

📈 "Total X in YEAR":
1. Main entity: table with the date
2. Date filter: main_table.created_at
3. Aggregate: COUNT(*) or SUM(amount)

🔍 "Which users did X":
1. Return: user.name (not just user_id!)
2. Join to users table for names
3. Include context (count, amount, etc.)

${'='.repeat(80)}
QUERY CONSTRUCTION RULES
${'='.repeat(80)}

1. ✅ ALWAYS filter dates on PRIMARY ENTITY tables
 - reservations, orders, users, appointments
 - NOT on: reservation_services, order_items, user_roles

2. ✅ ALWAYS JOIN for human-readable results
 - If question mentions "which service/product/user"
 - Include the name/title column in SELECT

3. ✅ ALWAYS provide context
 - Show top 10, not just top 1
 - Include totals or percentages
 - Add COUNT(*) for overall context

4. ✅ ALWAYS handle empty results
 - Check if you're using wrong table
 - Verify date column
 - Test without filters

5. ✅ ALWAYS use correct JOIN type
 - INNER JOIN: Must have relationship
 - LEFT JOIN: Include records without relationship

${'='.repeat(80)}
RESPONSE FORMAT
${'='.repeat(80)}

You MUST respond in this format:

**Pre-Query Analysis:**
- Main Entity: [table name]
- Date Column: [table.column] (verified: ✓/✗)
- Required Joins: [list joins]
- Output Fields: [list columns]
- Column Check: [verify each column exists]

**Query:**
[SQL here]

**Explanation:**
[Why this approach]

**Confidence:** [0.0-1.0]

${'='.repeat(80)}`;

  if (databaseSchema) {
    prompt += `\n📋 DATABASE SCHEMA\n`;
    prompt += `${'='.repeat(80)}\n`;
    prompt += databaseSchema;
    prompt += `\n${'='.repeat(80)}\n\n`;
    
    prompt += `🔍 SCHEMA ANALYSIS CHECKLIST:\n`;
    prompt += `Before EVERY query, identify:\n`;
    prompt += `1. Which tables have 'created_at' or date columns?\n`;
    prompt += `2. Which tables are JUNCTION/LINKING tables? (have multiple foreign keys)\n`;
    prompt += `3. Which tables are PRIMARY ENTITIES? (main business objects)\n`;
    prompt += `4. Which tables are REFERENCE tables? (lookup data like services, products)\n\n`;
    
    prompt += `⚠️  REMINDER: Use ONLY columns from schema above.\n`;
    prompt += `⚠️  REMINDER: Filter dates on PRIMARY ENTITY tables, not junction tables!\n`;
    prompt += `${'='.repeat(80)}\n`;
  }

  return prompt;
}

// ADDITIONAL RECOMMENDATION: Add post-query validation
validateQuery(query, schema) {
const issues = [];

// Check for date filters on junction tables
const junctionTables = ['reservation_services', 'order_items', 'user_roles'];
junctionTables.forEach(table => {
  if (query.match(new RegExp(`${table}\\.created_at|WHERE.*${table}.*YEAR`, 'i'))) {
    issues.push(`⚠️  Warning: Filtering date on junction table '${table}' - should filter on main entity`);
  }
});

// Check for SELECT with only IDs (no names)
if (query.match(/SELECT.*_id.*FROM/i) && !query.match(/\.name|\.title/i)) {
  issues.push(`⚠️  Warning: Returning only IDs - consider JOINing for human-readable names`);
}

return issues;
}
executeQuery(query, schema) {
  const issues = validateQuery(query, schema);
  if (issues.length > 0) {
    console.warn('Query validation issues:', issues);
    // Optionally: ask LLM to regenerate with issues highlighted
  }
  // ... execute query
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
