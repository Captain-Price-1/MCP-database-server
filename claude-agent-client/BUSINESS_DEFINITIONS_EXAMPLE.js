/**
 * EXAMPLE: How to Add Business Definitions
 * 
 * Copy this file and modify the definitions object in businessDefinitions.js
 * Or use environment variables (see .env.example)
 */

// Example definitions you can add:

export const exampleDefinitions = {
  // Time-based definitions
  quietTimes: "Quiet times are defined as the time periods (3-hour windows) where the least number of reservations are made. When analyzing quiet times, calculate reservations grouped by 3-hour time windows and identify periods with the lowest booking counts.",
  
  peakHours: "Peak hours are Monday-Friday from 10am-2pm and 5pm-8pm. These are the busiest periods for reservations.",
  
  // Customer definitions
  activeCustomer: "An active customer is defined as someone who has made at least one purchase or reservation in the last 90 days.",
  
  vipCustomer: "A VIP customer is someone with lifetime purchases exceeding $10,000 or has been a customer for more than 2 years.",
  
  inactiveCustomer: "An inactive customer is someone who has NOT made a purchase or reservation in the last 180 days.",
  
  // Product/Service definitions
  topPerformingService: "A top performing service is defined by the service with the highest total revenue in the specified time period.",
  
  bestSeller: "A best seller is the product or service with the highest number of bookings in the specified time period.",
  
  // Business-specific metrics
  revenuePerCustomer: "Revenue per customer is calculated as total revenue divided by the number of unique customers in the time period.",
  
  averageBookingValue: "Average booking value is the total revenue divided by the total number of bookings.",
  
  // Shop/Location definitions
  topShop: "The top shop is the location with the highest total revenue or highest number of bookings in the specified time period.",
  
  // Custom business logic
  seasonalTrend: "Seasonal trends are analyzed by grouping bookings by month and identifying patterns that repeat annually.",
};

/**
 * HOW TO USE:
 * 
 * 1. Edit src/businessDefinitions.js
 * 2. Add your definitions to the definitions object:
 * 
 *    const definitions = {
 *      quietTimes: "Your definition here...",
 *      activeCustomer: "Another definition...",
 *      // Add more...
 *    };
 * 
 * 3. Or use environment variable BUSINESS_DEFINITIONS as JSON:
 * 
 *    BUSINESS_DEFINITIONS='{"quietTimes":"Your definition","activeCustomer":"Another definition"}'
 * 
 * 4. Definitions are automatically prepended to every query
 * 5. Claude will use these definitions when interpreting business terms
 */

