import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class McpCalClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected = false;

  constructor() {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["@calcom/cal-mcp"],
    });

    this.client = new Client({
      name: "cal-ai-client",
      version: "1.0.0",
    });
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect(this.transport);
      this.connected = true;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }

  async callTool(name: string, args: Record<string, any>) {
    await this.connect();
    return await this.client.callTool({ name, arguments: args });
  }

  async listTools() {
    await this.connect();
    return await this.client.listTools();
  }
}

export const mcpClient = new McpCalClient();
