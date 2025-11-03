# Business Definitions and Custom Instructions

This file provides business-specific definitions and instructions for Claude to use when interpreting queries. These definitions ensure Claude understands your company's specific terminology and business logic.

## Business Definitions

### Quiet Times

**Quiet times** are defined as the time periods (3-hour windows) where the least number of reservations are made. When analyzing quiet times:

1. Group reservations by 3-hour time windows (e.g., 0-3, 3-6, 6-9, 9-12, 12-15, 15-18, 18-21, 21-24)
2. Calculate total reservations per 3-hour window
3. Identify the windows with the lowest booking counts
4. These periods are the "quiet times"

**Example Query:** "Show me the quiet times for October"
- Should return 3-hour windows with least reservations
- Results should be grouped in 3-hour increments
- Show the booking count for each window

### Active Customer

**Active Customer** is defined as a customer who had at least 1 reservation in the past 3 months for that particular shop. When analyzing active customers:

1. Filter reservations from the last 3 months (90 days from today)
2. Group by shop ID (analyze per shop, not globally)
3. Count unique customers per shop who have at least 1 reservation
4. These customers are "active customers" for that specific shop

**Example Query:** "Show me active customers for shop 35"
- Should return customers with at least 1 reservation in the last 3 months for shop 35
- Results should be grouped by shop if querying multiple shops
- Exclude customers with no reservations in the past 3 months
- Each shop should have its own list of active customers

### VIP Customer

(Add your definition here when needed)

### Peak Hours

(Add your definition here when needed)

## General Instructions

When users ask about business concepts defined above:

- **Always use the exact definitions** provided, not generic AI interpretations
- **Calculate metrics according to the specifications** (e.g., 3-hour windows for quiet times)
- **Include context** about how calculations were performed in your responses
- **Respect time windows exactly** as specified (e.g., 3-hour windows means exactly 3 hours, not approximations)

## How to Add More Definitions

To add more business definitions, follow this format:

### Definition Name

**Definition Name** is defined as [your clear definition]. When analyzing [concept]:

1. [Step 1 - How to calculate/identify it]
2. [Step 2]
3. [Step 3]

**Example Query:** "[example of how users might ask about this]"
- Expected behavior: [what Claude should do]

---

**Note:** This file is automatically loaded by Claude via `settingSources: ['project']` in the query options. No code changes needed - just edit this file!

