# Using CLAUDE.md for Business Definitions

## Overview

This project now uses the **standard Claude SDK approach** with `CLAUDE.md` files for business definitions. This is the recommended way to provide project-specific context to Claude.

---

## How It Works

### Automatic Loading

The `CLAUDE.md` file is automatically loaded for every query because we've configured:

```javascript
const queryOptions = {
  systemPrompt: { preset: 'claude_code' },
  settingSources: ['project'], // ← This loads CLAUDE.md automatically!
  // ... other options
};
```

### File Location

The `CLAUDE.md` file should be in the project root directory:

```
claude-agent-client/
├── CLAUDE.md              ← Edit this file for business definitions
├── src/
│   └── api.js             ← Automatically uses CLAUDE.md
└── ...
```

---

## Adding Business Definitions

### Step 1: Edit CLAUDE.md

Open `CLAUDE.md` and add your definitions following this format:

```markdown
### Your Definition Name

**Your Definition Name** is defined as [your definition]. When analyzing [concept]:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Example Query:** "[example]"
```

### Step 2: Save and Test

1. Save `CLAUDE.md`
2. Restart your API server (if needed)
3. Test with a query that uses your definition

**That's it!** No code changes needed. Claude will automatically use your definitions.

---

## Current Definitions

### Quiet Times ✅

Already defined in `CLAUDE.md`:

- **Quiet times** = 3-hour windows with least reservations
- Automatically grouped by 3-hour increments
- Identifies periods with lowest booking counts

**Try it:**
```
User: "Show me quiet times for October"
Claude: [Uses YOUR definition - 3-hour windows, not generic interpretation]
```

---

## Adding More Definitions

### Example: Active Customer

Add to `CLAUDE.md`:

```markdown
### Active Customer

**Active Customer** is defined as a customer who has made at least one purchase or reservation in the last 90 days. When analyzing active customers:

1. Filter customers with transactions in the last 90 days
2. Count unique customers (not transactions)
3. Include customer ID and last activity date

**Example Query:** "Show me active customers"
- Should return customers with activity in last 90 days
- Exclude customers with no activity in this period
```

### Example: VIP Customer

```markdown
### VIP Customer

**VIP Customer** is defined as a customer with:
- Lifetime purchases exceeding $10,000, OR
- Been a customer for more than 2 years

When identifying VIP customers:
1. Calculate lifetime revenue per customer
2. Calculate customer tenure from first purchase
3. Include customers meeting either criterion
```

---

## Benefits of CLAUDE.md Approach

✅ **Standard SDK method** - Recommended by Anthropic  
✅ **No code changes** - Just edit a markdown file  
✅ **Version controlled** - Easy to track changes in git  
✅ **Documentation** - Definitions serve as documentation  
✅ **Persistent context** - Loaded automatically for every query  

---

## File Structure

```
claude-agent-client/
├── CLAUDE.md                    ← Your business definitions (EDIT THIS)
├── CLAUDE_MD_GUIDE.md           ← This guide
├── src/
│   ├── api.js                   ← Uses settingSources: ['project']
│   └── businessDefinitions.js   ← (Legacy - can be removed if not needed)
└── ...
```

---

## Comparison: Old vs New

### Old Approach (Manual Prepend)
```javascript
const businessDefinitions = getBusinessDefinitionsPrompt();
const enhancedPrompt = businessDefinitions + userPrompt;
```
❌ Requires code changes  
❌ Separate file with JS objects  
❌ Less standard  

### New Approach (CLAUDE.md)
```javascript
settingSources: ['project']  // Automatically loads CLAUDE.md
```
✅ Standard SDK approach  
✅ Just edit markdown file  
✅ No code changes needed  
✅ Recommended by Anthropic  

---

## Troubleshooting

**Q: Claude isn't using my definitions**

**A:**
1. Check that `CLAUDE.md` is in the project root
2. Verify `settingSources: ['project']` is in query options
3. Restart API server after editing CLAUDE.md
4. Check console for errors

**Q: Can I use both CLAUDE.md and environment variables?**

**A:** CLAUDE.md is preferred. If you need environment variables, they would be in addition to CLAUDE.md.

**Q: Where should CLAUDE.md be located?**

**A:** In the project root (`claude-agent-client/CLAUDE.md`)

---

## Next Steps

1. ✅ **Review** `CLAUDE.md` - Your "quiet times" is already there!
2. ✅ **Add more definitions** - Follow the format in the file
3. ✅ **Test** - Query using your definitions
4. ✅ **Done!** - No code changes needed

---

**Note:** The old `businessDefinitions.js` file is still there but no longer used. You can remove it if you prefer to use only CLAUDE.md.

