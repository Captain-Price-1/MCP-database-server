import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';

/**
 * MCP Client implementation using STDIO transport
 * Connects to mcp-database-server as a subprocess
 */
export class MCPClient extends EventEmitter {
  constructor(serverPath, args = []) {
    super();
    this.serverPath = serverPath;
    this.args = args;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.serverProcess = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.availableTools = [];
    this.availableResources = [];
  }

  /**
   * Connect to the MCP server
   */
  async connect() {
    try {
      console.log(`Starting MCP server: ${this.serverPath} ${this.args.join(' ')}`);
      
      // Spawn the MCP server process
      this.serverProcess = spawn('node', [this.serverPath, ...this.args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Set up communication
      this.setupCommunication();
      
      // Wait for server to be ready
      await this.waitForServerReady();
      
      // Initialize the MCP session
      await this.initialize();
      
      this.isConnected = true;
      this.emit('connected');
      
      console.log('✅ MCP client connected successfully');
      
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Set up communication with the server
   */
  setupCommunication() {
    // Handle stdout (server responses)
    const rl = createInterface({
      input: this.serverProcess.stdout,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      try {
        // Skip empty lines
        if (!line.trim()) return;
        
        // Skip log messages that start with [INFO], [ERROR], etc.
        if (line.match(/^\[(INFO|ERROR|WARN|DEBUG)\]/)) {
          return;
        }
        
        // Try to parse as JSON
        const response = JSON.parse(line);
        this.handleResponse(response);
      } catch (error) {
        // Only log parsing errors for non-log messages
        if (!line.match(/^\[(INFO|ERROR|WARN|DEBUG)\]/)) {
          console.error('Failed to parse server response:', error);
          console.error('Raw response:', line);
        }
      }
    });

    // Handle stderr (server logs)
    this.serverProcess.stderr.on('data', (data) => {
      const logMessage = data.toString().trim();
      if (logMessage) {
        console.log(`[Server] ${logMessage}`);
      }
    });

    // Handle server process events
    this.serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
      this.emit('error', error);
    });

    this.serverProcess.on('exit', (code, signal) => {
      console.log(`Server process exited with code ${code}, signal ${signal}`);
      this.isConnected = false;
      this.emit('disconnected', { code, signal });
    });
  }

  /**
   * Wait for server to be ready
   */
  async waitForServerReady() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      // Listen for server ready message
      const checkReady = (data) => {
        const message = data.toString();
        if (message.includes('Server running')) {
          clearTimeout(timeout);
          resolve();
        }
      };

      this.serverProcess.stderr.on('data', checkReady);
    });
  }

  /**
   * Initialize the MCP session
   */
  async initialize() {
    const initRequest = {
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { 
            listChanged: true 
          },
          sampling: {}
        },
        clientInfo: {
          name: "custom-mcp-client",
          version: "1.0.0"
        }
      }
    };

    const response = await this.sendRequest(initRequest);
    
    if (response.error) {
      throw new Error(`Initialization failed: ${response.error.message}`);
    }

    this.isInitialized = true;
    console.log('✅ MCP session initialized');
    
    // Load available tools and resources
    await this.loadCapabilities();
  }

  /**
   * Load available tools and resources
   */
  async loadCapabilities() {
    try {
      // Get available tools
      const toolsResponse = await this.listTools();
      this.availableTools = toolsResponse.tools || [];
      console.log(`📋 Found ${this.availableTools.length} available tools`);

      // Get available resources
      const resourcesResponse = await this.listResources();
      this.availableResources = resourcesResponse.resources || [];
      console.log(`📁 Found ${this.availableResources.length} available resources`);

    } catch (error) {
      console.warn('Warning: Could not load capabilities:', error.message);
    }
  }

  /**
   * List available tools
   */
  async listTools() {
    const request = {
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "tools/list"
    };

    return this.sendRequest(request);
  }

  /**
   * List available resources
   */
  async listResources() {
    const request = {
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "resources/list"
    };

    return this.sendRequest(request);
  }

  /**
   * Call a tool
   */
  async callTool(name, arguments_ = {}) {
    const request = {
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "tools/call",
      params: {
        name,
        arguments: arguments_
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Read a resource
   */
  async readResource(uri) {
    const request = {
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "resources/read",
      params: {
        uri
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Send a request to the server
   */
  sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || !this.serverProcess.stdin) {
        reject(new Error('Server not connected'));
        return;
      }

      this.pendingRequests.set(request.id, { resolve, reject });
      
      const message = JSON.stringify(request) + '\n';
      this.serverProcess.stdin.write(message);
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`Request timeout: ${request.method}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Handle responses from the server
   */
  handleResponse(response) {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(new Error(response.error.message || 'Unknown error'));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  /**
   * Get next request ID
   */
  getNextId() {
    return ++this.requestId;
  }

  /**
   * Disconnect from the server
   */
  async disconnect() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
    this.isConnected = false;
    this.isInitialized = false;
    this.emit('disconnected');
    console.log('🔌 MCP client disconnected');
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    return this.availableTools;
  }

  /**
   * Get available resources
   */
  getAvailableResources() {
    return this.availableResources;
  }

  /**
   * Check if client is connected
   */
  isClientConnected() {
    return this.isConnected && this.isInitialized;
  }
}
