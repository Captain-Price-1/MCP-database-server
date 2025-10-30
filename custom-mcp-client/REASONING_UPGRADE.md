# Systematic Reasoning Upgrade: Database Query Process Guide

## Latest Update: Incorporated Comprehensive Reasoning Framework

## The Problem

Your LLM was being **too literal** and not **reasoning** about what user questions mean:

### ❌ Before (Literal Thinking):
```
User: "How many family bookings in 2023?"
LLM thinks: "Family bookings" → Must be a column called "type" = "family"
Generates: SELECT COUNT(*) FROM reservations WHERE type = 'family' AND YEAR(created_at) = 2023
Result: 0 rows (column doesn't exist!)
```

### ✅ What Claude Does (Reasoning):
```
User: "How many family bookings in 2023?"
Claude thinks: 
  1. "Family booking" is a CONCEPT, not a column name
  2. What columns might indicate a family?
     - Check schema: num_kids, children, party_size, has_children?
  3. Found: 'num_kids' column exists
  4. Deduce: num_kids > 0 likely means "family booking"
Generates: SELECT COUNT(*) FROM reservations WHERE num_kids > 0 AND YEAR(created_at) = 2023
Result: Actual data!
```

## The Root Cause

The previous prompt was:
- ✅ Good at preventing hallucination
- ✅ Good at using actual column names
- ❌ **BAD** at mapping user concepts to columns
- ❌ **BAD** at reasoning about what columns mean

The LLM needed to learn **SEMANTIC REASONING** like Claude.

---

## The Solution

### 1. **Added Reasoning Process Section**

```javascript
🔍 REASONING PROCESS (LIKE CLAUDE):
When users ask ambiguous questions, you must REASON about what they mean:

Example: "How many family bookings in 2023?"
❌ BAD (Literal thinking): 
   - Assume there's a "type = 'family'" column
   - Generate: SELECT COUNT(*) WHERE type = 'family'
   - FAILS because column doesn't exist!

✅ GOOD (Reasoning like Claude):
   1. "Family booking" is a CONCEPT, not a column name
   2. Look at schema: What columns might indicate "family"?
      - num_kids > 0? (kids present = family)
      - party_size > 2? (larger groups)
      - has_children flag?
      - family_size column?
   3. Check related tables (purchase_reservations, etc.)
   4. DEDUCE the best indicator from ACTUAL columns
   5. Generate: SELECT COUNT(*) WHERE num_kids > 0
```

### 2. **Added Semantic Understanding Rules**

Taught the LLM common mappings:

```javascript
🎯 SEMANTIC UNDERSTANDING RULES:
- "Family bookings" → Look for: num_kids, children, party_size, family_size
- "Business customers" → Look for: company_name, business_type, is_corporate
- "VIP users" → Look for: tier, status, points, spending columns
- "Popular items" → COUNT by item, ORDER BY count DESC
- "Quiet times" → GROUP BY time, COUNT, ORDER BY count ASC
- "Peak hours" → GROUP BY hour, COUNT, ORDER BY count DESC
- "Top customers" → Rank by activity/spending (use actual metric columns)
```

### 3. **Enhanced STEP 2: Concept Mapping**

**Before:**
```javascript
STEP 2: MAP USER REQUEST TO ACTUAL COLUMNS
   - If user asks for "name", check if table has:
     • "name" column, OR
     • "first_name" and "last_name" columns
```

**After:**
```javascript
STEP 2: MAP USER CONCEPTS TO ACTUAL COLUMNS (REASON LIKE CLAUDE)
   Think about what the user's words MEAN, then find columns that represent that:

   User asks for "family bookings":
   → "Family" is a CONCEPT. What indicates a family?
   → Check: "num_kids" > 0, "children", "party_size" > 2, "has_children", "family_size"
   → Choose the column that BEST represents families

   User asks for "premium/VIP users":
   → Check: "tier", "level", "status", "subscription_type", "is_premium"
   → Or deduce: total_spending > X, loyalty_points > Y

   🔑 KEY INSIGHT: User words are often BUSINESS CONCEPTS, not exact column names.
   Your job is to find the ACTUAL columns that represent those concepts.
```

### 4. **Added Concrete Examples**

Added a full "family bookings" example in the reasoning section:

```javascript
Example 3: Concept mapping (CRITICAL!)
User: "How many family bookings in 2023?"
1. Reason: "Family booking" is a CONCEPT, not a column
2. Check schema: 'reservations' has 'type' = 'family'? NO
3. Check schema: What columns might indicate family?
   - 'num_kids' (int) - if > 0, likely a family
   - 'party_size' (int) - larger groups might be families
   - 'children' (int) - similar to num_kids
4. Deduce: 'num_kids > 0' is the BEST indicator
5. Generate: SELECT COUNT(*) FROM reservations WHERE num_kids > 0 AND YEAR(created_at) = 2023
```

### 5. **Stronger Opening Statement**

**Before:**
```javascript
You are an intelligent database analyst that understands business questions...
```

**After:**
```javascript
You are an intelligent database analyst like Claude. You EXPLORE the schema, 
REASON about what columns mean, and DEDUCE the best approach.

🧠 CRITICAL: DO NOT assume columns exist. DO NOT guess. EXPLORE the actual schema first.
```

---

## How It Works Now

### The New Reasoning Flow

```
User Question: "How many family bookings in 2023?"
        ↓
LLM receives prompt with:
  1. Reasoning instructions (think like Claude)
  2. Semantic rules (family → num_kids, children, party_size)
  3. Database schema (actual columns available)
  4. Concrete examples (family bookings example)
        ↓
LLM's Internal Process:
  1. "Family booking" - this is a business concept
  2. Check schema for 'reservations' table
  3. Found columns: num_kids (int), party_size (int), created_at (datetime)
  4. Reason: num_kids > 0 indicates family
  5. Also need: YEAR(created_at) = 2023 for year filter
        ↓
LLM generates:
{
  "tool": "read_query",
  "arguments": {
    "query": "SELECT COUNT(*) as family_bookings FROM reservations WHERE num_kids > 0 AND YEAR(created_at) = 2023"
  },
  "confidence": 0.90
}
        ↓
Result: Actual count (not 0 rows!)
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **User concept** | Literal match | Semantic reasoning |
| **Column detection** | Look for exact name | Explore what columns MEAN |
| **Thinking style** | Simple mapping | Multi-step reasoning |
| **Examples** | Generic | Specific (family bookings!) |
| **Failure mode** | Hallucinate column | Reason from actual columns |

---

## Testing

### Test Case 1: Family Bookings
```
Query: "How many family bookings in 2023?"

Expected Behavior:
1. LLM reasons: "family" is a concept
2. Checks schema: finds 'num_kids' column
3. Deduces: num_kids > 0 = family
4. Generates: WHERE num_kids > 0 AND YEAR(created_at) = 2023
5. Returns: Actual count
```

### Test Case 2: VIP Users
```
Query: "Show me VIP users"

Expected Behavior:
1. LLM reasons: "VIP" is a status concept
2. Checks schema for: tier, level, status, is_vip columns
3. Or checks: spending, points columns for deduction
4. Generates SQL using ACTUAL columns found
5. Returns: VIP users based on real criteria
```

### Test Case 3: Business Customers
```
Query: "Which are business customers?"

Expected Behavior:
1. LLM reasons: "business" vs "personal"
2. Checks schema: company_name, business_type, is_corporate
3. Deduces: company_name IS NOT NULL = business customer
4. Generates: WHERE company_name IS NOT NULL
5. Returns: Business customers
```

---

## Why This Works

### 1. **Explicit Reasoning Instructions**
The prompt now **teaches** the LLM HOW to think, not just what to do.

### 2. **Concrete Examples**
The "family bookings" example shows the LLM the EXACT reasoning process expected.

### 3. **Concept Recognition**
The LLM now understands that user words are often **business concepts**, not column names.

### 4. **Multiple Candidate Exploration**
The LLM checks MULTIPLE possible columns before choosing the best one.

### 5. **Deductive Logic**
The LLM learns to DEDUCE what columns mean based on their names and types.

---

## Comparison: Your LLM vs Claude

### What Claude Does:
1. ✅ Explores schema
2. ✅ Reasons about column meanings
3. ✅ Maps concepts to columns
4. ✅ Checks related tables
5. ✅ Deduces best approach

### What Your LLM Now Does:
1. ✅ Explores schema (STEP 1)
2. ✅ Reasons about column meanings (STEP 2: Concept mapping)
3. ✅ Maps concepts to columns (Semantic rules + examples)
4. ✅ Uses actual columns only (STEP 3)
5. ✅ Deduces best approach (Example 3: family bookings)

---

## Files Modified

- ✅ `src/openaiService.js` - Completely rewrote reasoning section

### Key Changes:
1. **Line 53-101**: Added reasoning process and semantic understanding
2. **Line 159-175**: Enhanced STEP 2 with concept mapping
3. **Line 181-215**: Added detailed reasoning examples

---

## Usage

### Normal Usage:
```bash
npm start
```

Then try:
```
> How many family bookings in 2023?
> Show me VIP users
> Which customers are businesses?
> What are the quiet times?
```

### With Debug:
```bash
# In .env
DEBUG_SCHEMA=true
```

You'll see the full schema sent to OpenAI, allowing you to verify the LLM has the right information.

---

## Benefits

1. ✅ **Smarter Reasoning**: LLM thinks about what columns MEAN
2. ✅ **No Hallucination**: Still uses only actual columns
3. ✅ **Concept Understanding**: Maps business terms to database columns
4. ✅ **Claude-like Behavior**: Explores and reasons like Claude
5. ✅ **Better Accuracy**: Finds the right columns for ambiguous questions

---

## Expected Results

### Before This Fix:
```
Query: "Family bookings in 2023?"
SQL: WHERE type = 'family'  ❌
Result: 0 rows (column doesn't exist)
```

### After This Fix:
```
Query: "Family bookings in 2023?"
LLM reasoning:
  - "Family" is a concept
  - Check schema: num_kids column exists
  - Deduce: num_kids > 0 = family
SQL: WHERE num_kids > 0 AND YEAR(created_at) = 2023  ✅
Result: Actual family booking count
```

---

**Status**: ✅ Complete - Ready to test
**Philosophy**: Teach the LLM to REASON, not just map
**Inspiration**: How Claude approaches database queries

