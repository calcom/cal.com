import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";

/**
 * Cancels a booking for a user by ID with reason.
 */
const cancelBooking = async ({
  apiKey,
  id,
  reason,
}: {
  apiKey: string;
  id: string;
  reason: string;
}): Promise<string | { error: string }> => {
  const params = {
    apiKey,
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

  // Let GPT handle this. This will happen when wrong booking id is used.
  // if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return "Booking cancelled";
};

const cancelBookingTool = (apiKey: string) => {
  return new DynamicStructuredTool({
    description: "Cancel a booking",
    func: async ({ id, reason }) => {
      return JSON.stringify(
        await cancelBooking({
          apiKey,
          id,
          reason,
        })
      );
    },
    name: "cancelBooking",
    schema: z.object({
      id: z.string(),
      reason: z.string(),
    }),
  });
};

export default cancelBookingTool;
