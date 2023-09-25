import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";

/**
 * Edits a booking for a user by booking ID with new times, title, description, or status.
 */
const editBooking = async ({
  apiKey,
  userId,
  id,
  startTime, // In the docs it says start, but it's startTime: https://cal.com/docs/enterprise-features/api/api-reference/bookings#edit-an-existing-booking.
  endTime, // Same here: it says end but it's endTime.
  title,
  description,
  status,
}: {
  apiKey: string;
  userId: number;
  id: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
  status?: string;
}): Promise<string | { error: string }> => {
  const params = {
    apiKey,
    userId: userId.toString(),
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

  // Let GPT handle this. This will happen when wrong booking id is used.
  // if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return "Booking edited";
};

const editBookingTool = (apiKey: string, userId: number) => {
  return new DynamicStructuredTool({
    description: "Edit a booking",
    func: async ({ description, endTime, id, startTime, status, title }) => {
      return JSON.stringify(
        await editBooking({
          apiKey,
          userId,
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
      description: z.string().optional(),
      endTime: z.string().optional(),
      id: z.string(),
      startTime: z.string().optional(),
      status: z.string().optional(),
      title: z.string().optional(),
    }),
  });
};

export default editBookingTool;
