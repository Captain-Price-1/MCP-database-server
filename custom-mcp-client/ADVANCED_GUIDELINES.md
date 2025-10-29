# Advanced Query Guidelines - Added to LLM Prompt

## What Was Added

I've added **6 critical advanced guidelines** to the OpenAI prompt to prevent common query mistakes, especially around:
- Date filtering on wrong tables
- Missing JOINs for readable results
- Empty result investigation
- Counting precision
- JOIN type selection
- Context provision

These guidelines are now **permanently embedded** in the LLM's system prompt and will be applied to every query.

---

## The 6 Advanced Guidelines

### 📅 GUIDELINE 1: Date Filtering on Correct Tables

**The Problem:**
Junction/relationship tables (like `reservation_services`, `order_items`) have their own `created_at` timestamp that represents when the **LINK** was created, NOT when the main entity was created.

**The Solution:**
Always filter dates on the **PRIMARY ENTITY** table:

```sql
-- ❌ WRONG: Filtering on relationship table
SELECT service_id, COUNT(*) 
FROM reservation_services 
WHERE YEAR(created_at) = 2023  -- This is when the LINK was created!
GROUP BY service_id;

-- ✅ CORRECT: Filter on primary entity, then join
SELECT rs.service_id, COUNT(*) 
FROM reservations r                    -- Primary entity
JOIN reservation_services rs ON r.id = rs.reservation_id
WHERE YEAR(r.created_at) = 2023       -- When reservation was created
GROUP BY rs.service_id;
```

**Table Classification:**
- **PRIMARY ENTITIES**: reservations, orders, users → Filter dates HERE
- **JUNCTION TABLES**: reservation_services, order_items → DON'T filter dates here
- **REFERENCE TABLES**: services, products, categories → Lookup data

---

### 🔗 GUIDELINE 2: Always JOIN for Human-Readable Results

**The Problem:**
User asks "Which service was most used?" but query returns `service_id: 967` (meaningless without context).

**The Solution:**
ALWAYS JOIN to reference tables to get names/descriptions:

```sql
-- ❌ WRONG: Returns meaningless IDs
SELECT service_id, COUNT(*) as count
FROM reservation_services
GROUP BY service_id;

-- ✅ CORRECT: Includes service names
SELECT 
    ss.id as service_id,
    ss.name as service_name,      -- Human-readable!
    COUNT(*) as count
FROM reservation_services rs
JOIN shop_services ss ON rs.service_id = ss.id
GROUP BY ss.id, ss.name;
```

**When to JOIN:**
- Question asks for "name", "title", "description"
- Result would show only IDs
- User needs context to understand results

---

### 🔍 GUIDELINE 3: Investigate Empty Results

**The Problem:**
Query returns 0 rows, LLM just says "No results found" without investigating why.

**The Solution:**
Follow this investigation protocol:

**Step 1** - Verify data exists:
```sql
SELECT COUNT(*), MIN(created_at), MAX(created_at)
FROM primary_table
WHERE YEAR(created_at) = 2023;
```

**Step 2** - Check if wrong date column:
- Are you filtering on junction table instead of entity?
- Check which `created_at` you're using

**Step 3** - Test without time filter:
- Remove date filter temporarily to see if data exists

**Step 4** - Sample raw data:
```sql
SELECT * FROM table LIMIT 5;
```

Then **adjust query** based on findings or **report accurate issue** to user.

---

### 🎲 GUIDELINE 4: Count the Right Thing

**The Problem:**
Being imprecise about what you're counting leads to wrong results.

**The Solution:**
Be precise:

```sql
-- "How many RESERVATIONS used service X?"
COUNT(DISTINCT reservation_id)  -- Count unique reservations

-- "How many TIMES was service X used?"
COUNT(*)                        -- Count all occurrences

-- "How many UNIQUE SERVICES were used?"
COUNT(DISTINCT service_id)      -- Count unique services
```

---

### 🔄 GUIDELINE 5: INNER vs LEFT JOIN Decision

**When to use INNER JOIN:**
- Relationship MUST exist
- Counting related entities
- Want to EXCLUDE records without relationships

**When to use LEFT JOIN:**
- Want to include records EVEN WITHOUT relationships
- Counting "all X, including those without Y"
- Need to show NULL for missing data

**Examples:**
```sql
-- "Reservations with services" → INNER JOIN
-- "All reservations, show services if any" → LEFT JOIN
```

---

### 📊 GUIDELINE 6: Provide Context, Not Just Minimum Answer

**The Problem:**
Only returning top 1 result without context.

**The Solution:**
Provide comprehensive results:

```sql
-- ❌ MINIMAL: Only top result
SELECT name, COUNT(*) as count
FROM ... ORDER BY count DESC LIMIT 1;

-- ✅ BETTER: Top 5-10 with percentages and totals
SELECT 
    name,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ...
GROUP BY name
ORDER BY count DESC
LIMIT 10;
```

**Include in explanation:**
- Direct answer to question
- Top N results (not just top 1)
- Totals for context
- Any caveats or assumptions

---

## Anti-Patterns Now Explicitly Flagged

The LLM is now trained to avoid these common mistakes:

1. ❌ Date filter on junction table (use primary entity!)
2. ❌ Returning only IDs (JOIN to get names!)
3. ❌ Accepting empty results (investigate why!)
4. ❌ Counting wrong metric (be precise!)
5. ❌ Over-limiting results (show top 10, not just 1)
6. ❌ Ignoring NULLs (handle explicitly!)

---

## Golden Rules Summary

The LLM now follows these golden rules for every query:

1. **Primary Entity First**: Filter dates on main entity, not relationships
2. **Always JOIN for Names**: If question asks for names, JOIN to references
3. **Validate Empty Results**: 0 rows = investigate, don't just report
4. **Provide Context**: Show top N, totals, percentages
5. **Be Precise**: Count the right thing, use correct JOIN type
6. **Handle Edge Cases**: NULLs, soft deletes, time zones

---

## How This Improves Your Queries

### Before (Without Guidelines):

**Query:** "Which service was most used in October 2023?"

```sql
-- ❌ Problems:
SELECT service_id, COUNT(*) as count
FROM reservation_services
WHERE YEAR(created_at) = 2023 AND MONTH(created_at) = 10
GROUP BY service_id
ORDER BY count DESC
LIMIT 1;

Issues:
1. Returns only ID (967) - not readable
2. Filters on junction table date - wrong!
3. Only shows top 1 - no context
```

### After (With Guidelines):

**Query:** "Which service was most used in October 2023?"

```sql
-- ✅ Correct:
SELECT 
    ss.id as service_id,
    ss.name as service_name,
    COUNT(*) as usage_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM reservations r                              -- Primary entity!
JOIN reservation_services rs ON r.id = rs.reservation_id
JOIN shop_services ss ON rs.service_id = ss.id  -- Get names!
WHERE YEAR(r.created_at) = 2023                 -- Filter on entity date
  AND MONTH(r.created_at) = 10
GROUP BY ss.id, ss.name
ORDER BY usage_count DESC
LIMIT 10;                                        -- Top 10 with context

Benefits:
1. Returns service names - readable!
2. Filters on primary entity date - correct!
3. Shows top 10 with percentages - context!
```

---

## Real-World Example

### Your "Family Bookings" Query

**Before advanced guidelines:**
- Might use wrong date column
- Might miss data due to incorrect JOIN
- Might not investigate if 0 rows returned

**After advanced guidelines:**
- Filters on `reservations.created_at` (primary entity)
- Uses correct JOIN to get service names if needed
- If 0 rows, investigates why before reporting

---

## Testing the Guidelines

### Test Case 1: Service Usage Query
```
Query: "Which service was most used in October 2023?"

Expected Behavior:
1. ✅ Identifies 'reservations' as primary entity
2. ✅ Filters date on reservations.created_at
3. ✅ JOINs to shop_services for names
4. ✅ Returns top 10 with percentages
5. ✅ Provides context and totals
```

### Test Case 2: Empty Results
```
Query: "Services used in December 2025?"

Expected Behavior (if no data):
1. ✅ Checks if data exists for 2025
2. ✅ Verifies date column is correct
3. ✅ Samples raw data
4. ✅ Reports: "No reservations found for 2025" (not just "0 rows")
```

### Test Case 3: ID vs Name
```
Query: "Top users who made reservations?"

Expected Behavior:
1. ✅ JOINs to users table for first_name/last_name
2. ✅ Returns names, not just user_id
3. ✅ Shows top 10, not just top 1
```

---

## File Modified

**File**: `src/openaiService.js`

**Changes**:
- **Lines 157-305**: Added 6 advanced guidelines with examples
- **No removal**: All existing guidelines preserved
- **Total addition**: ~150 lines of critical guidance

---

## Impact

### Query Accuracy
- ✅ Correct date filtering (primary entity vs junction)
- ✅ Readable results (names, not IDs)
- ✅ Proper investigation of issues
- ✅ Precise counting
- ✅ Appropriate JOINs
- ✅ Comprehensive context

### User Experience
- ✅ Meaningful results (service names, not IDs)
- ✅ Context (top 10, percentages, totals)
- ✅ Accurate time filtering
- ✅ Better explanations when issues occur

### Reliability
- ✅ Fewer "0 rows" mysteries
- ✅ Correct relationship handling
- ✅ Proper NULL handling
- ✅ Edge case awareness

---

## Summary

The LLM now has **comprehensive guidelines** to handle:
1. Complex table relationships (entity vs junction vs reference)
2. Accurate date filtering (primary entity timestamps)
3. Human-readable results (JOINs for names)
4. Empty result investigation (diagnostic protocol)
5. Precise metrics (COUNT vs COUNT DISTINCT)
6. Contextual responses (top N, percentages, totals)

These guidelines are **permanently embedded** and will apply to **every query** automatically! 🎯

