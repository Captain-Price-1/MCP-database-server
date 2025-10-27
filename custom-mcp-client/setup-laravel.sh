#!/bin/bash

# Laravel Database Setup Script for Custom MCP Client

echo "🚀 Laravel Database Setup for Custom MCP Client"
echo "=============================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the custom-mcp-client directory"
    exit 1
fi

echo "📋 Laravel Database Configuration Helper"
echo "This script will help you configure the MCP client to connect to your Laravel database."
echo

# Get Laravel project path
echo "Enter the path to your Laravel project (or press Enter to skip):"
read -r LARAVEL_PATH

if [ -n "$LARAVEL_PATH" ] && [ -d "$LARAVEL_PATH" ]; then
    echo "🔍 Reading Laravel database configuration..."
    
    # Read Laravel database config
    LARAVEL_ENV="$LARAVEL_PATH/.env"
    if [ -f "$LARAVEL_ENV" ]; then
        echo "✅ Found Laravel .env file"
        
        # Extract database configuration
        DB_CONNECTION=$(grep "^DB_CONNECTION=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        DB_HOST=$(grep "^DB_HOST=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        DB_PORT=$(grep "^DB_PORT=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        DB_DATABASE=$(grep "^DB_DATABASE=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        DB_USERNAME=$(grep "^DB_USERNAME=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        DB_PASSWORD=$(grep "^DB_PASSWORD=" "$LARAVEL_ENV" | cut -d'=' -f2 | tr -d '"')
        
        echo "📊 Laravel Database Configuration:"
        echo "   Connection: $DB_CONNECTION"
        echo "   Host: $DB_HOST"
        echo "   Port: $DB_PORT"
        echo "   Database: $DB_DATABASE"
        echo "   Username: $DB_USERNAME"
        echo "   Password: [HIDDEN]"
        echo
        
        # Generate MCP client configuration
        echo "🔧 Generating MCP client configuration..."
        
        cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Database Server Configuration
MCP_SERVER_PATH=../dist/src/index.js

# Database Configuration (from Laravel)
EOF

        if [ "$DB_CONNECTION" = "mysql" ]; then
            cat >> .env << EOF
DATABASE_TYPE=mysql
DATABASE_HOST=$DB_HOST
DATABASE_PORT=$DB_PORT
DATABASE_NAME=$DB_DATABASE
DATABASE_USER=$DB_USERNAME
DATABASE_PASSWORD=$DB_PASSWORD
EOF
        elif [ "$DB_CONNECTION" = "pgsql" ]; then
            cat >> .env << EOF
DATABASE_TYPE=postgresql
DATABASE_HOST=$DB_HOST
DATABASE_PORT=$DB_PORT
DATABASE_NAME=$DB_DATABASE
DATABASE_USER=$DB_USERNAME
DATABASE_PASSWORD=$DB_PASSWORD
DATABASE_SSL=false
EOF
        elif [ "$DB_CONNECTION" = "sqlite" ]; then
            cat >> .env << EOF
DATABASE_TYPE=sqlite
DATABASE_PATH=$LARAVEL_PATH/database/database.sqlite
EOF
        else
            echo "⚠️  Unsupported database type: $DB_CONNECTION"
            echo "   Please configure manually in .env file"
        fi
        
        echo "✅ MCP client configuration generated!"
        
    else
        echo "❌ Laravel .env file not found at $LARAVEL_ENV"
    fi
else
    echo "⚠️  Laravel path not provided or invalid"
    echo "   Please configure manually in .env file"
fi

echo
echo "📝 Next Steps:"
echo "1. Edit .env file and add your OpenAI API key"
echo "2. Test the connection: node test-connection.js"
echo "3. Start the client: npm start"
echo
echo "💡 Example queries for your Laravel database:"
echo "   • Show me all tables"
echo "   • What users are in the users table?"
echo "   • How many posts does each user have?"
echo "   • Show me the structure of the users table"
echo
echo "🎉 Setup completed!"
