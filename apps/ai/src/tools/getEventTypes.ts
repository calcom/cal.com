import { mcpClient } from "../utils/mcpClient";

export interface EventTypesParams {
  apiKey: string;
}

export interface EventTypesResponse {
  eventTypes?: any[];
  error?: string;
}

export async function fetchEventTypes(params: EventTypesParams): Promise<EventTypesResponse> {
  try {
    const result = await mcpClient.callTool("get_event_types", {
      apiKey: params.apiKey,
    });

    if (result.isError) {
      const content = result.content as Array<{ text?: string }>;
      return { error: content[0]?.text || "Failed to fetch event types" };
    }

    const content = result.content as Array<{ text?: string }>;
    const eventTypesData = JSON.parse(content[0]?.text || "{}");
    return { eventTypes: eventTypesData.eventTypes || [] };
  } catch (error) {
    console.error("Error fetching event types:", error);
    return { error: (error as Error).message };
  }
}
