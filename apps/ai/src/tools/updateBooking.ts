import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import { decrypt } from "../utils/encryption";

/**
 * Edits a booking for a user by booking ID with new times, title, description, or status.
 */
const editBooking = async ({
  apiKeyHashed,
  apiKeyIV,
  id,
  startTime, // In the docs it says start, but it's startTime: https://cal.com/docs/enterprise-features/api/api-reference/bookings#edit-an-existing-booking.
  endTime, // Same here: it says end but it's endTime.
  title,
  description,
  status,
}: {
  apiKeyHashed: string;
  apiKeyIV: string;
  id: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
  status?: string;
}): Promise<string | { error: string }> => {
  const params = {
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
  };
  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/bookings/${id}?${urlParams.toString()}`;

  const response = await fetch(url, {
    body: JSON.stringify({ description, endTime, startTime, status, title }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return "Booking edited";
};

const editBookingTool = new DynamicStructuredTool({
  description: "Edit a booking",
  func: async ({ apiKeyHashed, apiKeyIV, description, endTime, id, startTime, status, title }) => {
    return JSON.stringify(
      await editBooking({
        apiKeyHashed,
        apiKeyIV,
        description,
        endTime,
        id,
        startTime,
        status,
        title,
      })
    );
  },
  name: "editBooking",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    description: z.string().optional(),
    endTime: z.string().optional(),
    id: z.string(),
    startTime: z.string().optional(),
    status: z.string().optional(),
    title: z.string().optional(),
  }),
});

export default editBookingTool;
