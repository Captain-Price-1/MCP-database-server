# 🚀 Quick Start Guide - Claude Agent Client

## Get Running in 5 Minutes

### Step 1: Install Dependencies (1 min)

```bash
cd claude-agent-client
npm install
```

### Step 2: Configure (2 min)

```bash
# Copy environment template
cp env.example .env

# Edit .env and add your Claude API key
nano .env  # or use your favorite editor
```

Required settings in `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
DATABASE_TYPE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_NAME=laravel
DATABASE_USER=root
DATABASE_PASSWORD=root
```

### Step 3: Get Claude API Key (if you don't have one)

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy and paste into `.env`

### Step 4: Build MCP Server (1 min)

```bash
# Go to parent directory
cd ..

# Build the MCP server
npm run build

# Return to Claude client
cd claude-agent-client
```

### Step 5: Run! (1 min)

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🤖 Claude Agent Client with MCP Database         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

✅ Claude Agent Client ready!
💡 Type your natural language queries or "help" for commands

> _
```

## 🎯 Try These Queries

### Beginner
```
> How many tables are in the database?
> Show me all records from the users table
```

### Intermediate
```
> How many family bookings in 2023?
> Which service was most used in October?
```

### Advanced
```
> Give me the top 10 users by reservations with their names
> What are the quiet times for reservations?
> Show me revenue trends by month
```

## 💡 Tips

### For Laravel Users
Use `laravel-config.env` as a template:
```bash
cp laravel-config.env .env
# Then edit to add your Claude API key
```

### Debug Mode
Toggle debug output:
```
> debug
```

### See Configuration
```
> config
```

### Get Help
```
> help
```

## 🐛 Common Issues

### Issue: "ANTHROPIC_API_KEY is not set"
**Solution**: Make sure you copied `env.example` to `.env` and added your API key

### Issue: "Cannot find module '@anthropic-ai/claude-agent-sdk'"
**Solution**: Run `npm install` in the `claude-agent-client` directory

### Issue: "MCP server not found"
**Solution**: Build the parent project first:
```bash
cd ..
npm run build
cd claude-agent-client
```

### Issue: "Connection refused" (MySQL)
**Solution**: 
1. Start your MySQL server
2. Verify credentials in `.env`
3. Test connection: `mysql -u root -p`

## 🎉 You're All Set!

Now you have Claude's superior reasoning working with your database!

Try asking: **"How many family bookings were made in 2023?"**

Watch Claude:
1. Explore your database schema
2. Understand "family" means records with kids
3. Find the right columns (`num_kids`)
4. Generate correct SQL
5. Return meaningful results

No prompt engineering needed! 🚀

## 📚 Next Steps

- [ ] Run the test suite: `npm test`
- [ ] Try the demo: `npm run demo`
- [ ] Read the full [README.md](README.md)
- [ ] Compare with OpenAI client (see COMPARISON.md)

---

**Need help?** Check the [README.md](README.md) or the [troubleshooting section](#common-issues) above.

