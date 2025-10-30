/**
 * Simple test script for the API server
 * Run: node test-api.js
 */

async function testAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('🧪 Testing Claude Agent API\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = await healthResponse.json();
    console.log('✅ Health:', health);
    console.log('');

    // Test 2: Simple Query
    console.log('2️⃣  Testing simple query...');
    const queryResponse = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'How many tables are in the database?'
      })
    });
    const queryResult = await queryResponse.json();
    console.log('✅ Query Result:');
    console.log('   Success:', queryResult.success);
    console.log('   Response:', queryResult.response?.substring(0, 100) + '...');
    console.log('   Session ID:', queryResult.metadata?.sessionId);
    console.log('');

    // Test 3: Follow-up Query (with session)
    if (queryResult.success && queryResult.metadata?.sessionId) {
      console.log('3️⃣  Testing follow-up query with session...');
      const followUpResponse = await fetch(`${baseUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'List them',
          sessionId: queryResult.metadata.sessionId
        })
      });
      const followUpResult = await followUpResponse.json();
      console.log('✅ Follow-up Result:');
      console.log('   Success:', followUpResult.success);
      console.log('   Response:', followUpResult.response?.substring(0, 100) + '...');
      console.log('');
    }

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the API server is running: npm run api');
  }
}

testAPI();

