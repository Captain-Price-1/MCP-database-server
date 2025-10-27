import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment Variables Debug:');
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE);
console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('DATABASE_USER:', process.env.DATABASE_USER);
console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD);
console.log('MCP_SERVER_PATH:', process.env.MCP_SERVER_PATH);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set');
