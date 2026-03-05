/**
 * MCP (Model Context Protocol) server for Agent Cal.
 * Exposes calendar tools over stdio (JSON-RPC 2.0, newline-delimited).
 */

import { createInterface } from "node:readline";
import { loadStoredCredentials } from "../auth.js";
import { AgentCal } from "../client.js";

const TOOLS = [
  {
    name: "list_connections",
    description: "List calendar connections (connectionId, type, email). Use connectionId in other tools.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_calendars",
    description: "List connected calendars (legacy full shape)",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_events",
    description: "List calendar events in a date range for a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        from: { type: "string", description: "ISO date or date-time" },
        to: { type: "string", description: "ISO date or date-time" },
        timeZone: { type: "string" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "create_event",
    description: "Create a calendar event on a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        title: { type: "string" },
        start: { type: "object", properties: { time: { type: "string" }, timeZone: { type: "string" } }, required: ["time", "timeZone"] },
        end: { type: "object", properties: { time: { type: "string" }, timeZone: { type: "string" } }, required: ["time", "timeZone"] },
        description: { type: "string" },
        attendees: { type: "array", items: { type: "object", properties: { email: { type: "string" }, name: { type: "string" } } } },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "get_event",
    description: "Get a single event by ID for a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing event on a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        eventId: { type: "string" },
        title: { type: "string" },
        start: { type: "object", properties: { time: { type: "string" }, timeZone: { type: "string" } } },
        end: { type: "object", properties: { time: { type: "string" }, timeZone: { type: "string" } } },
        description: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "delete_event",
    description: "Delete/cancel a calendar event on a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_free_busy",
    description: "Get busy time slots for a connection",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: { type: "string", description: "Calendar connection ID from list_connections" },
        from: { type: "string" },
        to: { type: "string" },
        timeZone: { type: "string" },
      },
      required: ["from", "to"],
    },
  },
];

function send(id: string | number | null, result: unknown, error?: { code: number; message: string }): void {
  const msg = error
    ? { jsonrpc: "2.0", id, error: { code: error.code, message: error.message } }
    : { jsonrpc: "2.0", id, result };
  console.log(JSON.stringify(msg));
}

async function handleToolsList(): Promise<{ tools: Array<{ name: string; description: string; inputSchema: unknown }> }> {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

async function resolveConnectionId(cal: AgentCal, connectionId: string | undefined): Promise<string> {
  if (connectionId) return connectionId;
  const connections = await cal.getConnections();
  if (connections.length === 0) throw new Error("No calendar connections. Run auth first.");
  return connections[0].connectionId;
}

async function handleToolsCall(cal: AgentCal, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_connections": {
      const connections = await cal.getConnections();
      return { connections };
    }
    case "get_calendars": {
      const res = await cal.getCalendars();
      return res;
    }
    case "list_events": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const from = args.from as string;
      const to = args.to as string;
      const timeZone = args.timeZone as string | undefined;
      const events = await cal.listEvents(connectionId, { from, to, timeZone });
      return { events };
    }
    case "create_event": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const title = args.title as string;
      const start = args.start as { time: string; timeZone: string };
      const end = args.end as { time: string; timeZone: string };
      const description = args.description as string | undefined;
      const attendees = args.attendees as Array<{ email: string; name?: string }> | undefined;
      const event = await cal.createEvent(connectionId, { title, start, end, description, attendees });
      return { event };
    }
    case "get_event": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const eventId = args.eventId as string;
      const event = await cal.getEvent(connectionId, eventId);
      return { event };
    }
    case "update_event": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const eventId = args.eventId as string;
      const update = {
        title: args.title as string | undefined,
        start: args.start as { time: string; timeZone: string } | undefined,
        end: args.end as { time: string; timeZone: string } | undefined,
        description: args.description as string | undefined,
      };
      const event = await cal.updateEvent(connectionId, eventId, update);
      return { event };
    }
    case "delete_event": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const eventId = args.eventId as string;
      await cal.deleteEvent(connectionId, eventId);
      return { success: true };
    }
    case "get_free_busy": {
      const connectionId = await resolveConnectionId(cal, args.connection_id as string | undefined);
      const from = args.from as string;
      const to = args.to as string;
      const timeZone = args.timeZone as string | undefined;
      const busy = await cal.getFreeBusy(connectionId, { from, to, timeZone });
      return { busy };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function runMcpServer(): Promise<void> {
  const creds = await loadStoredCredentials();
  if (!creds?.accessToken) {
    console.error(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Not authenticated. Run: npx @calcom/agent-cal auth" },
    }));
    process.exit(1);
  }
  const cal = new AgentCal({ accessToken: creds.accessToken });

  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    let req: { id?: string | number; method?: string; params?: unknown };
    try {
      req = JSON.parse(line) as { id?: string | number; method?: string; params?: unknown };
    } catch {
      send(undefined as unknown as string, undefined, { code: -32700, message: "Parse error" });
      return;
    }
    const id = req.id ?? null;
    try {
      if (req.method === "initialize") {
        send(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "agent-cal", version: "0.1.0" },
        });
        return;
      }
      if (req.method === "tools/list") {
        const result = await handleToolsList();
        send(id, result);
        return;
      }
      // MCP notifications (e.g. notifications/initialized) don't require a response
      if (req.method?.startsWith("notifications/")) {
        return;
      }
      if (req.method === "tools/call") {
        const params = (req.params as { name?: string; arguments?: Record<string, unknown> }) ?? {};
        const name = params.name;
        const args = (params.arguments as Record<string, unknown>) ?? {};
        if (!name) {
          send(id, undefined, { code: -32602, message: "Missing tool name" });
          return;
        }
        const result = await handleToolsCall(cal, name, args);
        send(id, { content: [{ type: "text", text: JSON.stringify(result) }] });
        return;
      }
      send(id, undefined, { code: -32601, message: "Method not found" });
    } catch (err) {
      send(id, undefined, {
        code: -32603,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
