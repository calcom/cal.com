import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import { decrypt } from "../utils/encryption";

/**
 * Creates a booking for a user by event type, times, and timezone.
 */
const createBooking = async ({
  apiKeyHashed,
  apiKeyIV,
  eventTypeId,
  start,
  end,
  timeZone,
  language,
  responses,
  description,
}: {
  apiKeyHashed: string;
  apiKeyIV: string;
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
  language: string;
  responses: { name?: string; email?: string; location?: string };
  title?: string;
  description?: string;
  status?: string;
}): Promise<string | Error | { error: string }> => {
  const params = {
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
  };

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/bookings?${urlParams.toString()}`;

  const response = await fetch(url, {
    body: JSON.stringify({
      description,
      end,
      eventTypeId,
      language,
      metadata: {},
      responses,
      start,
      timeZone,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  const data = await response.json();

  if (response.status !== 200) {
    return {
      error: data.message,
    };
  }

  return "Booking created";
};

const createBookingTool = new DynamicStructuredTool({
  description:
    "Tries to create a booking. If the user is unavailable, it will return availability that day, allowing you to avoid the getAvailability step in many cases.",
  func: async ({
    apiKeyHashed,
    apiKeyIV,
    eventTypeId,
    start,
    end,
    timeZone,
    language,
    responses,
    title,
    description,
    status,
  }) => {
    return JSON.stringify(
      await createBooking({
        apiKeyHashed,
        apiKeyIV,
        description,
        end,
        eventTypeId,
        language,
        responses,
        start,
        status,
        timeZone,
        title,
      })
    );
  },
  name: "createBookingIfAvailable",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    description: z.string().optional(),
    end: z
      .string()
      .describe("This should correspond to the event type's length, unless otherwise specified."),
    eventTypeId: z.number(),
    language: z.string(),
    responses: z
      .object({
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .describe("External invited user. Not the user making the request."),
    start: z.string(),
    status: z.string().optional().describe("ACCEPTED, PENDING, CANCELLED or REJECTED"),
    timeZone: z.string(),
    title: z.string().optional(),
  }),
});

export default createBookingTool;
