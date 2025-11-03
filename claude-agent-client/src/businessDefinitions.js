/**
 * Business Definitions and Custom Instructions
 * 
 * These definitions guide Claude on how to interpret business-specific terms
 * and concepts according to your company's standards.
 */

/**
 * Load business definitions from environment or file
 */
function loadBusinessDefinitions() {
  // You can load from environment variable or a JSON file
  // For now, we'll use a simple function that returns definitions
  
  const definitions = {
    // Example: Quiet Times definition
    quietTimes: "Quiet times are defined as the time periods (3-hour windows) where the least number of reservations are made. When analyzing quiet times, calculate reservations grouped by 3-hour time windows and identify periods with the lowest booking counts.",
    
    // Add more definitions here:
    // activeCustomer: "An active customer is defined as someone who has made at least one purchase in the last 90 days...",
    // vipCustomer: "A VIP customer is someone with lifetime purchases exceeding $10,000...",
    // peakHours: "Peak hours are Monday-Friday 10am-2pm and 5pm-8pm...",
  };
  
  // Load from environment if available
  if (process.env.BUSINESS_DEFINITIONS) {
    try {
      const envDefs = JSON.parse(process.env.BUSINESS_DEFINITIONS);
      return { ...definitions, ...envDefs };
    } catch (e) {
      console.warn('[BUSINESS DEFS] Failed to parse BUSINESS_DEFINITIONS env var:', e.message);
    }
  }
  
  return definitions;
}

/**
 * Format business definitions as a system instruction string
 */
export function getBusinessDefinitionsPrompt() {
  const definitions = loadBusinessDefinitions();
  
  // If no definitions, return empty string
  if (Object.keys(definitions).length === 0) {
    return '';
  }
  
  let prompt = `\n\n=== BUSINESS DEFINITIONS ===
IMPORTANT: Use these definitions when interpreting business terms and concepts:

`;
  
  Object.entries(definitions).forEach(([key, value]) => {
    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    prompt += `• ${formattedKey}: ${value}\n\n`;
  });
  
  prompt += `\nWhen the user asks about these concepts, apply these exact definitions.\n=== END BUSINESS DEFINITIONS ===\n\n`;
  
  return prompt;
}

/**
 * Get definitions as a map for programmatic access
 */
export function getBusinessDefinitions() {
  return loadBusinessDefinitions();
}

/**
 * Add a new definition programmatically
 */
export function addBusinessDefinition(key, definition) {
  // This could write to a file or environment variable
  // For now, just log it
  console.log(`[BUSINESS DEFS] Would add: ${key} = ${definition}`);
}

export default {
  getBusinessDefinitionsPrompt,
  getBusinessDefinitions,
  addBusinessDefinition
};

