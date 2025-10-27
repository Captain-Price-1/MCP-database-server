# Laravel Database Configuration for Custom MCP Client

## 🚀 Connecting Your Laravel 8 Database

### Step 1: Check Your Laravel Database Configuration

First, check your Laravel `.env` file to see what database you're using:

```bash
# In your Laravel project directory
cat .env | grep -E "DB_CONNECTION|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD"
```

### Step 2: Configure MCP Client for Your Database Type

#### **For MySQL/MariaDB (Most Common)**

Update your MCP client `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Database Server Configuration
MCP_SERVER_PATH=../dist/src/index.js

# MySQL Configuration (matching your Laravel settings)
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=your_laravel_database_name
DATABASE_USER=your_laravel_db_user
DATABASE_PASSWORD=your_laravel_db_password
```

#### **For PostgreSQL**

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Database Server Configuration
MCP_SERVER_PATH=../dist/src/index.js

# PostgreSQL Configuration
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=your_laravel_database_name
DATABASE_USER=your_laravel_db_user
DATABASE_PASSWORD=your_laravel_db_password
DATABASE_SSL=false
```

#### **For SQLite**

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MCP Database Server Configuration
MCP_SERVER_PATH=../dist/src/index.js

# SQLite Configuration
DATABASE_TYPE=sqlite
DATABASE_PATH=/path/to/your/laravel/database/database.sqlite
```

### Step 3: Example Laravel Database Settings

If your Laravel `.env` looks like this:
```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_app
DB_USERNAME=root
DB_PASSWORD=password
```

Then your MCP client `.env` should be:
```bash
DATABASE_TYPE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=laravel_app
DATABASE_USER=root
DATABASE_PASSWORD=password
```

### Step 4: Test the Connection

```bash
# Test the connection
node test-connection.js

# Start the interactive client
npm start
```

### Step 5: Example Queries for Laravel Database

Once connected, you can query your Laravel database with natural language:

```
> Show me all tables
> What users are in the users table?
> How many posts does each user have?
> Show me the structure of the users table
> Find users created in the last month
> Export the users table to CSV
```

## 🔧 Laravel-Specific Features

The MCP client will work with your Laravel database and can:

- **Read Laravel tables**: Query users, posts, comments, etc.
- **Understand Laravel conventions**: Recognize Laravel's naming patterns
- **Handle Laravel relationships**: Understand foreign key relationships
- **Work with migrations**: See table structures created by Laravel migrations
- **Export data**: Export Laravel data to CSV/JSON formats

## 🚨 Important Notes

1. **Database Access**: Make sure your database user has appropriate permissions
2. **Laravel Migrations**: The MCP client will see tables created by Laravel migrations
3. **Laravel Models**: You can query data that would normally be accessed through Laravel models
4. **Security**: The MCP client connects directly to your database, bypassing Laravel's ORM

## 🎯 Quick Setup Commands

```bash
# 1. Check your Laravel database config
cd /path/to/your/laravel/project
cat .env | grep DB_

# 2. Update MCP client config
cd /path/to/mcp-database-server/custom-mcp-client
# Edit .env file with your Laravel database settings

# 3. Test connection
node test-connection.js

# 4. Start using it
npm start
```

## 💡 Pro Tips

- **Use Laravel's database name**: Copy the exact database name from your Laravel `.env`
- **Check permissions**: Ensure your database user can read/write to the Laravel database
- **Test with simple queries first**: Start with "Show me all tables" to verify connection
- **Laravel conventions**: The client will understand Laravel's table naming (users, posts, etc.)
