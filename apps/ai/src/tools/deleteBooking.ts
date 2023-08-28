import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import { decrypt } from "../utils/encryption";

/**
 * Cancels a booking for a user by ID with reason.
 */
const cancelBooking = async ({
  apiKeyHashed,
  apiKeyIV,
  id,
  reason,
}: {
  apiKeyHashed: string;
  apiKeyIV: string;
  id: string;
  reason: string;
}): Promise<string | { error: string }> => {
  const params = {
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
  };

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/bookings/${id}/cancel?${urlParams.toString()}`;

  const response = await fetch(url, {
    body: JSON.stringify({ reason }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "DELETE",
  });

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return "Booking cancelled";
};

const cancelBookingTool = new DynamicStructuredTool({
  description: "Cancel a booking",
  func: async ({ apiKeyHashed, apiKeyIV, id, reason }) => {
    return JSON.stringify(
      await cancelBooking({
        apiKeyHashed,
        apiKeyIV,
        id,
        reason,
      })
    );
  },
  name: "cancelBooking",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    id: z.string(),
    reason: z.string(),
  }),
});

export default cancelBookingTool;
