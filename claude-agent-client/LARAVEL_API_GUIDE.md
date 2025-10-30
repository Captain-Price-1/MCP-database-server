# Laravel API Integration Guide

Complete guide for integrating the Claude Agent API with your Laravel application.

## 🚀 Quick Start

### 1. Start the API Server

```bash
cd claude-agent-client
npm install  # Install new dependencies (express, cors)
npm run api  # Start API server on port 3000
```

### 2. Test the API

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How many tables are in the database?"}'
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "claude-agent-api",
  "version": "1.0.0",
  "activeSessions": 3
}
```

### Query Endpoint
```
POST /query
```

**Request Body:**
```json
{
  "prompt": "Show me top 5 barbers by reservations and create a chart",
  "sessionId": "optional-session-id",
  "newSession": false
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here are the top 5 barbers:\n\n1. Barber #418 - 44 reservations\n2. Barber #422 - 19 reservations...",
  "charts": [
    "https://mdn.alipayobjects.com/one_clip/afts/img/xxxxx/original"
  ],
  "metadata": {
    "toolsUsed": ["read_query", "generate_column_chart"],
    "cost": 0.072,
    "turns": 26,
    "sessionId": "session_1234567890_abc123"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "response": null
}
```

### Clear Session
```
POST /session/clear
```

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123"
}
```

### Get Session Info
```
GET /session/:sessionId
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_1234567890_abc123",
    "messageCount": 10,
    "createdAt": "2025-10-30T08:00:00.000Z",
    "lastActivity": "2025-10-30T08:15:00.000Z"
  }
}
```

## 🔧 Laravel Integration

### 1. Create a Service Class

Create `app/Services/ClaudeAgentService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ClaudeAgentService
{
    protected $baseUrl;
    protected $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.claude_agent.url', 'http://localhost:3000');
        $this->timeout = config('services.claude_agent.timeout', 60);
    }

    /**
     * Query the Claude Agent API
     */
    public function query(string $prompt, ?string $sessionId = null, bool $newSession = false): array
    {
        $response = Http::timeout($this->timeout)
            ->post("{$this->baseUrl}/query", [
                'prompt' => $prompt,
                'sessionId' => $sessionId,
                'newSession' => $newSession,
            ]);

        if ($response->failed()) {
            throw new \Exception('Claude Agent API request failed: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Query with automatic session management for user
     */
    public function queryForUser(int $userId, string $prompt, bool $newSession = false): array
    {
        $sessionKey = "claude_session_user_{$userId}";
        
        if ($newSession) {
            Cache::forget($sessionKey);
            $sessionId = null;
        } else {
            $sessionId = Cache::get($sessionKey);
        }

        $result = $this->query($prompt, $sessionId, $newSession);

        if ($result['success'] && isset($result['metadata']['sessionId'])) {
            // Store session ID for 1 hour
            Cache::put($sessionKey, $result['metadata']['sessionId'], now()->addHour());
        }

        return $result;
    }

    /**
     * Clear user's session
     */
    public function clearUserSession(int $userId): void
    {
        $sessionKey = "claude_session_user_{$userId}";
        $sessionId = Cache::get($sessionKey);

        if ($sessionId) {
            Http::post("{$this->baseUrl}/session/clear", [
                'sessionId' => $sessionId,
            ]);
            Cache::forget($sessionKey);
        }
    }

    /**
     * Health check
     */
    public function health(): array
    {
        $response = Http::get("{$this->baseUrl}/health");
        return $response->json();
    }
}
```

### 2. Add Configuration

Add to `config/services.php`:

```php
'claude_agent' => [
    'url' => env('CLAUDE_AGENT_URL', 'http://localhost:3000'),
    'timeout' => env('CLAUDE_AGENT_TIMEOUT', 60),
],
```

Add to `.env`:

```env
CLAUDE_AGENT_URL=http://localhost:3000
CLAUDE_AGENT_TIMEOUT=120
```

### 3. Create a Controller

Create `app/Http/Controllers/QueryController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Services\ClaudeAgentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class QueryController extends Controller
{
    protected $claudeAgent;

    public function __construct(ClaudeAgentService $claudeAgent)
    {
        $this->claudeAgent = $claudeAgent;
    }

    /**
     * Process a query
     */
    public function query(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string|max:5000',
            'new_session' => 'boolean',
        ]);

        try {
            $userId = $request->user()->id;
            $result = $this->claudeAgent->queryForUser(
                $userId,
                $request->input('prompt'),
                $request->input('new_session', false)
            );

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to process query',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear conversation history
     */
    public function clearHistory(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $this->claudeAgent->clearUserSession($userId);

            return response()->json([
                'success' => true,
                'message' => 'Conversation history cleared'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to clear history'
            ], 500);
        }
    }

    /**
     * Health check
     */
    public function health(): JsonResponse
    {
        try {
            $health = $this->claudeAgent->health();
            return response()->json($health);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 503);
        }
    }
}
```

### 4. Add Routes

Add to `routes/api.php`:

```php
use App\Http\Controllers\QueryController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/query', [QueryController::class, 'query']);
    Route::post('/query/clear', [QueryController::class, 'clearHistory']);
    Route::get('/query/health', [QueryController::class, 'health']);
});
```

## 📝 Usage Examples

### Basic Query

```php
use App\Services\ClaudeAgentService;

$claude = app(ClaudeAgentService::class);

$result = $claude->query("How many users are in the database?");

if ($result['success']) {
    echo $result['response'];
}
```

### Query with Session Management

```php
$userId = auth()->id();

// First query - creates new session
$result1 = $claude->queryForUser($userId, "Show me top 10 products");

// Follow-up query - uses same session, remembers context
$result2 = $claude->queryForUser($userId, "What about the one in 3rd place?");
```

### Request with Chart Generation

```php
$result = $claude->queryForUser(
    $userId,
    "Show me monthly sales for 2024 and create a line chart"
);

if ($result['success']) {
    $response = $result['response'];  // Text analysis
    $chartUrls = $result['charts'];    // Array of chart image URLs
    
    foreach ($chartUrls as $chartUrl) {
        echo "<img src='{$chartUrl}' alt='Sales Chart' />";
    }
}
```

### Clear Session (New Topic)

```php
// Start fresh conversation
$result = $claude->queryForUser($userId, "Show me orders", newSession: true);
```

## 🎯 Frontend Integration (JavaScript)

### Using Fetch API

```javascript
async function query(prompt, newSession = false) {
    const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
            prompt: prompt,
            new_session: newSession
        })
    });

    return await response.json();
}

// Usage
const result = await query("Show me barbers by reservations with a chart");

if (result.success) {
    document.getElementById('response').innerHTML = result.response;
    
    // Display charts
    result.charts.forEach(chartUrl => {
        const img = document.createElement('img');
        img.src = chartUrl;
        document.getElementById('charts').appendChild(img);
    });
}
```

### Using Axios

```javascript
import axios from 'axios';

axios.post('/api/query', {
    prompt: "What are the top products?",
    new_session: false
})
.then(response => {
    const { success, response: answer, charts } = response.data;
    
    if (success) {
        console.log('Answer:', answer);
        console.log('Charts:', charts);
    }
})
.catch(error => {
    console.error('Error:', error);
});
```

## 🔒 Security Considerations

### 1. Rate Limiting

Add rate limiting in Laravel:

```php
// In RouteServiceProvider.php
protected function configureRateLimiting()
{
    RateLimit::for('query', function (Request $request) {
        return Limit::perMinute(10)->by($request->user()->id);
    });
}

// In routes/api.php
Route::middleware(['auth:sanctum', 'throttle:query'])->group(function () {
    Route::post('/query', [QueryController::class, 'query']);
});
```

### 2. Input Validation

```php
$request->validate([
    'prompt' => [
        'required',
        'string',
        'max:5000',
        'regex:/^[a-zA-Z0-9\s\.,!?\-]+$/' // Only allow safe characters
    ]
]);
```

### 3. Cost Tracking

```php
// Log query costs
Log::channel('claude_costs')->info('Query processed', [
    'user_id' => $userId,
    'cost' => $result['metadata']['cost'],
    'turns' => $result['metadata']['turns'],
    'prompt_length' => strlen($request->input('prompt'))
]);
```

## 🚀 Production Deployment

### 1. Use Process Manager

```bash
# Install PM2
npm install -g pm2

# Start API server
pm2 start src/api.js --name claude-agent-api

# Save PM2 process list
pm2 save

# Auto-start on reboot
pm2 startup
```

### 2. Nginx Reverse Proxy

```nginx
location /claude-api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 120s;
}
```

### 3. Environment Variables

```env
# Production settings
API_PORT=3000
CLAUDE_MODEL=claude-sonnet-4-20250514
MAX_TOKENS=8192
DEBUG=false
```

## 📊 Response Format Details

### Success Response

```json
{
  "success": true,
  "response": "Full text response from Claude...",
  "charts": [
    "https://chart-url-1.com/image.png",
    "https://chart-url-2.com/image.png"
  ],
  "metadata": {
    "toolsUsed": ["read_query", "list_tables", "generate_bar_chart"],
    "cost": 0.045,
    "turns": 15,
    "sessionId": "session_abc123"
  }
}
```

### Fields Explained

- `success`: Boolean indicating if request was successful
- `response`: The full text response from Claude (markdown formatted)
- `charts`: Array of chart image URLs (empty if no charts)
- `metadata.toolsUsed`: Array of MCP tool names that were called
- `metadata.cost`: Total cost in USD for this query
- `metadata.turns`: Number of conversation turns (complexity indicator)
- `metadata.sessionId`: Session ID for follow-up queries

## 🧪 Testing

```bash
# Install dependencies
cd claude-agent-client
npm install

# Start API server
npm run api

# In another terminal, test the API
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me all tables in the database"
  }'
```

## 💡 Tips

1. **Session Management**: Use sessions for multi-turn conversations
2. **New Session**: Start fresh when changing topics
3. **Timeout**: Set appropriate timeout (60-120s for complex queries)
4. **Error Handling**: Always check `success` field
5. **Cost Tracking**: Monitor `metadata.cost` for budget control
6. **Chart URLs**: Chart URLs are hosted on AntV's CDN

## 🐛 Troubleshooting

### API Not Starting

```bash
# Check if port is in use
lsof -i :3000

# Check dependencies
cd claude-agent-client
npm install
```

### Connection Refused from Laravel

```php
// Check if API is running
try {
    $health = Http::get('http://localhost:3000/health');
    dd($health->json());
} catch (\Exception $e) {
    dd($e->getMessage());
}
```

### Timeout Errors

Increase timeout in Laravel:

```php
Http::timeout(120)->post(...)
```

---

**Ready to integrate! Start the API server and connect your Laravel app! 🚀**

