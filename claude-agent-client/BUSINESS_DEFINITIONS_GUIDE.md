# Business Definitions Guide

## Overview

Business Definitions allow you to define custom business terms and concepts so Claude understands your company's specific definitions, not generic AI interpretations.

**Example:** If your business defines "quiet times" as "3-hour windows with least reservations", Claude will use that exact definition instead of guessing what "quiet times" means.

---

## Quick Start

### Method 1: Edit the File (Easiest)

1. Open `src/businessDefinitions.js`
2. Add your definitions to the `definitions` object:

```javascript
const definitions = {
  quietTimes: "Quiet times are defined as the time periods (3-hour windows) where the least number of reservations are made. When analyzing quiet times, calculate reservations grouped by 3-hour time windows and identify periods with the lowest booking counts.",
  
  activeCustomer: "An active customer is defined as someone who has made at least one purchase or reservation in the last 90 days.",
  
  // Add more definitions...
};
```

3. Save and restart the API server
4. Claude will now use these definitions in every query!

---

### Method 2: Environment Variable (For Deployment)

Add to your `.env` file:

```bash
BUSINESS_DEFINITIONS='{"quietTimes":"Quiet times are 3-hour windows with least reservations","activeCustomer":"Active customers have made at least one purchase in last 90 days"}'
```

**Note:** Must be valid JSON string. Use single quotes to wrap the JSON.

---

## How It Works

1. **Every query** gets your business definitions prepended automatically
2. Claude reads these definitions before processing the user's request
3. When Claude encounters terms like "quiet times" or "active customer", it uses YOUR definition
4. Definitions are also included in SMS/Email analysis calls

---

## Example Definitions

Here are common definitions you might want to add:

### Customer Definitions

```javascript
activeCustomer: "An active customer is defined as someone who has made at least one purchase or reservation in the last 90 days.",

vipCustomer: "A VIP customer is someone with lifetime purchases exceeding $10,000 or has been a customer for more than 2 years.",

inactiveCustomer: "An inactive customer is someone who has NOT made a purchase or reservation in the last 180 days."
```

### Time-Based Definitions

```javascript
quietTimes: "Quiet times are defined as the time periods (3-hour windows) where the least number of reservations are made. When analyzing quiet times, calculate reservations grouped by 3-hour time windows and identify periods with the lowest booking counts.",

peakHours: "Peak hours are Monday-Friday from 10am-2pm and 5pm-8pm. These are the busiest periods for reservations."
```

### Performance Definitions

```javascript
topPerformingService: "A top performing service is defined by the service with the highest total revenue in the specified time period.",

bestSeller: "A best seller is the product or service with the highest number of bookings in the specified time period."
```

### Metric Definitions

```javascript
revenuePerCustomer: "Revenue per customer is calculated as total revenue divided by the number of unique customers in the time period.",

averageBookingValue: "Average booking value is the total revenue divided by the total number of bookings."
```

---

## Testing

After adding definitions, test with a query that uses your custom term:

**User Query:**
```
"Show me the quiet times for this month"
```

**Expected Behavior:**
- Claude should group reservations by 3-hour windows
- Identify periods with lowest booking counts
- Use YOUR definition of "quiet times", not a generic one

---

## Best Practices

1. **Be Specific:** Include calculation methods, time periods, thresholds
   - ❌ Bad: "Quiet times are slow periods"
   - ✅ Good: "Quiet times are 3-hour windows with the least reservations"

2. **Include Context:** Explain how to calculate or identify the concept
   - ✅ "Calculate reservations grouped by 3-hour time windows"

3. **Use Clear Language:** Write as if explaining to a colleague
   - ✅ "An active customer has made at least one purchase in the last 90 days"

4. **Test After Adding:** Make sure Claude uses your definition correctly

---

## File Structure

```
claude-agent-client/
├── src/
│   ├── businessDefinitions.js    ← Edit this file
│   └── api.js                     ← Automatically uses definitions
└── BUSINESS_DEFINITIONS_GUIDE.md  ← This file
```

---

## Troubleshooting

**Problem:** Claude isn't using my definitions

**Solution:**
1. Check that definitions are in the `definitions` object
2. Restart the API server after changes
3. Check console logs for `[BUSINESS DEFS]` messages

**Problem:** Definitions too long/complex

**Solution:**
- Break into smaller, focused definitions
- Claude handles multiple definitions well
- Each definition should be clear and concise

---

## API Impact

When you add business definitions:

✅ **Main Query:** Uses definitions automatically  
✅ **SMS/Email Analysis:** Uses definitions automatically  
✅ **Chart Generation:** Context includes definitions  
✅ **All Queries:** Benefit from your custom logic

---

## Example Usage

**Before Adding Definitions:**
```
User: "Show me quiet times"
Claude: "I'll show you periods with low activity..." (generic interpretation)
```

**After Adding Definitions:**
```
User: "Show me quiet times"
Claude: "I'll calculate 3-hour reservation windows and find periods with the least bookings..." (uses YOUR definition!)
```

---

Need help? Check `BUSINESS_DEFINITIONS_EXAMPLE.js` for more examples!

