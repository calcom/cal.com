import { mcpClient } from "../utils/mcpClient";

export interface AvailabilityParams {
  apiKey: string;
  userId: number;
  dateFrom: string;
  dateTo: string;
}

export interface AvailabilityResponse {
  workingHours: any[];
  error?: string;
}

export async function fetchAvailability(params: AvailabilityParams): Promise<AvailabilityResponse> {
  try {
    const result = await mcpClient.callTool("get_availability", {
      apiKey: params.apiKey,
      userId: params.userId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });

    if (result.isError) {
      const content = result.content as Array<{ text?: string }>;
      return { workingHours: [], error: content[0]?.text || "Failed to fetch availability" };
    }

    const content = result.content as Array<{ text?: string }>;
    const availabilityData = JSON.parse(content[0]?.text || "{}");
    return { workingHours: availabilityData.workingHours || [] };
  } catch (error) {
    console.error("Error fetching availability:", error);
    return { workingHours: [], error: (error as Error).message };
  }
}
