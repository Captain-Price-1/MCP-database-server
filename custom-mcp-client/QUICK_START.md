# Quick Installation Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Prerequisites
- Node.js (v18+)
- OpenAI API key
- Your mcp-database-server built

### Step 2: Install
```bash
cd custom-mcp-client
./setup.sh
```

### Step 3: Configure
Edit `.env` file:
```bash
OPENAI_API_KEY=your_key_here
DATABASE_TYPE=sqlite
DATABASE_PATH=../mcp-database-server/data/test.db
```

### Step 4: Run
```bash
npm start
```

### Step 5: Query!
```
> Show me all tables
> How many users do we have?
> What is the structure of the products table?
```

## 🎯 That's it!

Your custom MCP client is now ready to process natural language database queries using OpenAI!

For detailed documentation, see `DETAILED_README.md`.
