#!/bin/bash

# Custom MCP Client Setup Script
# This script helps set up the custom MCP client with OpenAI integration

set -e

echo "🚀 Custom MCP Client Setup"
echo "========================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo

# Check if mcp-database-server is built
echo "🔍 Checking mcp-database-server..."
if [ -f "../mcp-database-server/dist/src/index.js" ]; then
    echo "✅ mcp-database-server is built and ready"
else
    echo "⚠️  mcp-database-server not found or not built"
    echo "   Building mcp-database-server..."
    
    cd ../mcp-database-server
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ mcp-database-server built successfully"
        cd ../custom-mcp-client
    else
        echo "❌ Failed to build mcp-database-server"
        exit 1
    fi
fi

echo

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created from template"
    echo "⚠️  Please edit .env file and add your OpenAI API key and database configuration"
else
    echo "✅ .env file already exists"
fi

echo

# Check if OpenAI API key is set
if grep -q "your_openai_api_key_here" .env; then
    echo "⚠️  Please update your OpenAI API key in the .env file"
    echo "   Get your API key from: https://platform.openai.com/api-keys"
else
    echo "✅ OpenAI API key appears to be configured"
fi

echo

# Run a quick test
echo "🧪 Running quick test..."
if node src/test.js; then
    echo "✅ Test passed successfully"
else
    echo "⚠️  Test failed - please check your configuration"
fi

echo
echo "🎉 Setup completed!"
echo
echo "Next steps:"
echo "1. Edit .env file with your OpenAI API key and database settings"
echo "2. Run 'npm start' to start the interactive client"
echo "3. Run 'node examples/example-usage.js' to see examples"
echo "4. Run 'npm test' to run the test suite"
echo
echo "Happy querying! 🚀"
