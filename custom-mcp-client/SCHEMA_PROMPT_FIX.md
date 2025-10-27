# Schema-Aware Prompt Fix

## The Problem

The LLM was **hallucinating column names** instead of reading the actual database schema.

**Example:**
```
User: "give me the first_name of the user who created most reservations"
LLM Generated: SELECT u.name AS first_name...  ❌ WRONG!
Result: 0 rows (because 'name' column doesn't exist)
```

The users table actually has `first_name` and `last_name`, not `name`.

## Root Cause

The original prompt was too weak:
```
"Use this schema to understand available tables and columns."
```

The LLM was **generating SQL first**, then loosely referencing the schema. It wasn't **actively consulting** the schema before writing SQL.

## The Solution

### New Approach: Schema-First SQL Generation

**Completely rewrote the system prompt** to enforce a **3-STEP PROCESS**:

#### STEP 1: READ THE SCHEMA
- Identify relevant tables
- Note EXACT column names
- Check data types

#### STEP 2: MAP USER REQUEST TO ACTUAL COLUMNS
- User says "name" → Check if table has:
  - `name` column, OR
  - `first_name` + `last_name`, OR
  - `username`, OR
  - `full_name`
- User says "user" → Check foreign keys:
  - `user_id`, `creator_id`, `owner_id`, etc.
- User says "time/date" → Check:
  - `created_at`, `updated_at`, `reservation_time`, etc.

#### STEP 3: GENERATE SQL USING ONLY SCHEMA COLUMNS
- NEVER use columns not in schema
- If column doesn't exist → return low confidence
- Verify join columns exist in BOTH tables

### Example Thought Process

**Built-in Examples in the Prompt:**

```
User: "Give me the name of users"
1. Check schema: 'users' table exists? YES
2. Check schema: 'users' has 'name' column? NO
3. Check schema: 'users' has 'first_name' and 'last_name'? YES
4. Generate: SELECT CONCAT(first_name, ' ', last_name) as name FROM users
```

```
User: "Users who created most reservations"
1. Check schema: 'users' exists, 'reservations' exists
2. Check schema: How to join? Look for foreign keys
3. Found: 'reservations' has 'creator_id'
4. Generate: SELECT u.*, COUNT(r.id) FROM users u 
             JOIN reservations r ON u.id = r.creator_id 
             GROUP BY u.id ORDER BY COUNT(r.id) DESC
```

## What Changed

### File: `src/openaiService.js`

**Before:**
```javascript
if (databaseSchema) {
  prompt += `\n\nCurrent Database Schema:\n${databaseSchema}\n\nUse this schema...`;
}
```

**After:**
```javascript
if (databaseSchema) {
  prompt += `\n\n${'='.repeat(80)}\n`;
  prompt += `📋 DATABASE SCHEMA (READ THIS CAREFULLY BEFORE GENERATING SQL)\n`;
  prompt += `${'='.repeat(80)}\n\n`;
  prompt += databaseSchema;
  prompt += `\n${'='.repeat(80)}\n`;
  prompt += `\n🎯 CRITICAL INSTRUCTIONS FOR USING THE SCHEMA:\n\n`;
  prompt += `STEP 1: READ THE SCHEMA ABOVE\n`;
  prompt += `   - Identify which tables are relevant...\n`;
  // ... (full 3-step process with examples)
  prompt += `⚠️  REMEMBER: Your SQL will FAIL if you use columns that don't exist!\n`;
  prompt += `${'='.repeat(80)}\n`;
}
```

**Key Improvements:**
- ✅ Visual emphasis with separators
- ✅ Clear 3-step process
- ✅ Concrete examples of thought process
- ✅ Strong warning about using non-existent columns
- ✅ Teaches LLM how to handle "name" vs "first_name/last_name"
- ✅ Teaches LLM how to find foreign keys for joins

### File: `src/databaseService.js`

Added **optional debug logging**:
```javascript
if (process.env.DEBUG_SCHEMA === 'true') {
  console.log('🔍 DEBUG: Schema that will be sent to OpenAI:');
  console.log(schema);
}
```

### Files: `config.env`, `laravel-config.env`

Added debug flag:
```bash
DEBUG_SCHEMA=false  # Set to 'true' to see the full schema sent to OpenAI
```

## How to Use

### 1. Normal Usage (No Changes Needed)

Just run as before:
```bash
npm start
```

The LLM will now **automatically consult the schema** before generating SQL.

### 2. Debug Mode (To Verify Schema)

Edit your `.env` file:
```bash
DEBUG_SCHEMA=true
```

Then run:
```bash
npm start
```

You'll see the **full schema** that OpenAI receives, allowing you to verify:
- All tables are loaded
- All columns are correct
- Data types are shown
- Foreign keys are identified

### 3. Test Your Query Again

```
> give me the first_name of the user which created the most number of reservations in the year 2025
```

**Expected Behavior:**
- ✅ LLM reads schema
- ✅ LLM sees `users` table has `first_name` column
- ✅ LLM sees `reservations` table has `creator_id` foreign key
- ✅ LLM generates: `SELECT u.first_name, COUNT(r.id) FROM users u JOIN reservations r ON u.id = r.creator_id...`
- ✅ Returns actual data (not 0 rows!)

## Key Differences from Previous Attempt

### ❌ Previous Attempt (Validation-Based)
1. LLM generates SQL (maybe with wrong columns)
2. **After generation**, validate against schema
3. Block execution if invalid columns found
4. **Problem**: Too late! LLM already hallucinated

### ✅ Current Approach (Schema-First)
1. LLM **reads schema first**
2. LLM **maps** user request to actual columns
3. LLM **generates SQL** using only schema columns
4. **Benefit**: LLM learns to consult schema proactively

## Why This Works Better

1. **Cognitive Process**: Teaches the LLM a step-by-step process
2. **Examples**: Shows concrete examples of correct thinking
3. **Visual Emphasis**: Uses separators and emojis to grab attention
4. **Consequences**: Warns that SQL will FAIL with wrong columns
5. **No Post-Validation**: Relies on LLM doing it right the first time (with strong guidance)

## Testing

Try these queries:

### Should Work Now:
```
> give me the first_name of users
> show me users with their first_name and last_name
> which user created the most reservations?
> give me the name of the top user (should use CONCAT)
```

### Should Handle Gracefully:
```
> show me the "xyz" column from users (column doesn't exist)
```
Expected: Low confidence, explanation that column doesn't exist

## Troubleshooting

### If LLM Still Uses Wrong Columns:

1. **Enable debug mode**: Set `DEBUG_SCHEMA=true` in `.env`
2. **Check schema loading**: Is the schema showing the correct columns?
3. **Check OpenAI model**: Consider upgrading to `gpt-4o` for better instruction following
4. **Check schema format**: Make sure `describe_table` is returning proper column info

### If Schema Isn't Loading:

Check the console output:
```
📋 Database schema loaded
Could not describe table users: [error message]
```

If you see errors, the fallback mechanism should still extract columns from sample data.

## Benefits

- ✅ **No hallucination**: LLM uses actual column names
- ✅ **No post-validation**: Get it right the first time
- ✅ **Smart mapping**: Handles "name" → "first_name + last_name" automatically
- ✅ **Better joins**: Correctly identifies foreign keys
- ✅ **Debuggable**: Can see exactly what schema LLM receives
- ✅ **Educational**: Teaches LLM the correct process

## Files Modified

- ✅ `src/openaiService.js` - Enhanced prompt with 3-step process
- ✅ `src/databaseService.js` - Added debug logging
- ✅ `config.env` - Added DEBUG_SCHEMA flag
- ✅ `laravel-config.env` - Added DEBUG_SCHEMA flag

---

**Status**: ✅ Ready to test
**Approach**: Schema-first generation (not post-validation)
**Philosophy**: Teach the LLM to fish, don't validate after it guesses 🎣

