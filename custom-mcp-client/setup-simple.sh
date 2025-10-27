#!/bin/bash

# Simple setup script for the custom MCP client

echo "🚀 Setting up Custom MCP Client for ExecuteAutomation"
echo "=================================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the custom-mcp-client directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp config.env .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env and add your OpenAI API key"
else
    echo "✅ .env file already exists"
fi

# Check if mcp-database-server is built
echo "🔍 Checking mcp-database-server..."
if [ -f "../dist/src/index.js" ]; then
    echo "✅ mcp-database-server is built and ready"
else
    echo "⚠️  mcp-database-server not found or not built"
    echo "   Building mcp-database-server..."
    
    cd ..
    npm run build
    cd custom-mcp-client
    
    if [ $? -eq 0 ]; then
        echo "✅ mcp-database-server built successfully"
    else
        echo "❌ Failed to build mcp-database-server"
        exit 1
    fi
fi

echo
echo "🎉 Setup completed!"
echo
echo "Next steps:"
echo "1. Edit .env file and add your OpenAI API key:"
echo "   OPENAI_API_KEY=your_actual_api_key_here"
echo
echo "2. Run the demo to test the connection:"
echo "   node demo.js"
echo
echo "3. Start the interactive client:"
echo "   npm start"
echo
echo "4. Or run examples:"
echo "   node examples/example-usage.js"
echo
echo "Happy querying! 🚀"
