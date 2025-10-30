# Claude Agent REST API

Clean REST API for Laravel applications to query databases and generate charts using Claude + MCP servers.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your settings
```

### 3. Start API Server
```bash
npm run api
```

Server runs on `http://localhost:3000` (default)

## 📡 API Endpoints

### POST /query
Process a query with Claude

**Request:**
```json
{
  "prompt": "Show me top 5 barbers and create a chart",
  "sessionId": "optional-session-id",
  "newSession": false
}
```

**Response:**
```json
{
  "success": true,
  "response": "Text response from Claude...",
  "charts": ["https://chart-url.com/image.png"],
  "metadata": {
    "toolsUsed": ["read_query", "generate_column_chart"],
    "cost": 0.072,
    "turns": 26,
    "sessionId": "session_abc123"
  }
}
```

### GET /health
Check API status

### POST /session/clear
Clear conversation history

### GET /session/:sessionId
Get session information

## 🔧 Laravel Integration

See [LARAVEL_API_GUIDE.md](./LARAVEL_API_GUIDE.md) for complete Laravel integration guide.

**Quick Laravel Example:**

```php
use Illuminate\Support\Facades\Http;

$response = Http::timeout(120)->post('http://localhost:3000/query', [
    'prompt' => 'Show me monthly sales with a line chart'
]);

$result = $response->json();

if ($result['success']) {
    echo $result['response'];      // Text answer
    foreach ($result['charts'] as $chartUrl) {
        echo "<img src='$chartUrl'>";  // Chart images
    }
}
```

## ✨ Features

- ✅ Clean JSON responses (no debug output)
- ✅ Session management for multi-turn conversations
- ✅ Automatic chart generation via @antv/mcp-server-chart
- ✅ Database queries via MCP database server
- ✅ Cost tracking and metadata
- ✅ CORS enabled for browser requests
- ✅ Automatic session cleanup (1 hour inactivity)

## 🧪 Testing

### Test the API
```bash
node test-api.js
```

### Manual Test
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How many tables are in the database?"}'
```

## 📋 Configuration

Edit `.env`:

```env
API_PORT=3000
ANTHROPIC_API_KEY=your_key_here
DATABASE_TYPE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_NAME=laravel
DATABASE_USER=root
DATABASE_PASSWORD=root
```

## 🔒 Production

### Using PM2
```bash
pm2 start src/api.js --name claude-agent-api
pm2 save
pm2 startup
```

### Using Docker
```bash
docker build -t claude-agent-api .
docker run -p 3000:3000 --env-file .env claude-agent-api
```

## 📊 Response Format

### Success Response
- `success`: true
- `response`: Full text response (markdown formatted)
- `charts`: Array of chart URLs (empty if no charts)
- `metadata`: Request metadata (cost, tools used, session ID)

### Error Response
- `success`: false
- `error`: Error message
- `response`: null

## 💡 Tips

1. **Sessions**: Use `sessionId` for follow-up questions
2. **New Topics**: Set `newSession: true` to start fresh
3. **Timeout**: Set 60-120s timeout for complex queries
4. **Costs**: Check `metadata.cost` to track spending
5. **Charts**: Chart URLs are hosted on AntV's CDN (permanent)

## 📚 Documentation

- [LARAVEL_API_GUIDE.md](./LARAVEL_API_GUIDE.md) - Complete Laravel integration
- [QUICK_START.md](./QUICK_START.md) - CLI client guide
- [README.md](./README.md) - Main documentation

## 🐛 Troubleshooting

**API won't start:**
```bash
# Check dependencies
npm install

# Check .env configuration
cat .env

# Check if port is in use
lsof -i :3000
```

**Timeout errors:**
- Increase Laravel timeout: `Http::timeout(120)`
- Check database connection
- Verify Claude API key

**No response:**
- Check API is running: `curl http://localhost:3000/health`
- Check Claude API key is valid
- Check database credentials

---

**Made for Laravel ❤️ Powered by Claude Agent SDK + MCP**

