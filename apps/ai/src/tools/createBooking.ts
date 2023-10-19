import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import type { UserList } from "~/src/types/user";

import { env } from "../env.mjs";

/**
 * Creates a booking for a user by event type, times, and timezone.
 */
const createBooking = async ({
  apiKey,
  userId,
  users,
  eventTypeId,
  start,
  end,
  timeZone,
  language,
  invite,
}: {
  apiKey: string;
  userId: number;
  users: UserList;
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
  language: string;
  invite: number;
  title?: string;
  status?: string;
}): Promise<string | Error | { error: string }> => {
  const params = {
    apiKey,
    userId: userId.toString(),
  };

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/bookings?${urlParams.toString()}`;

  const user = users.find((u) => u.id === invite);

  if (!user) {
    return { error: `User with id ${invite} not found to invite` };
  }

  const responses = {
    id: invite.toString(),
    name: user.username,
    email: user.email,
  };

  const response = await fetch(url, {
    body: JSON.stringify({
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

  // Let GPT handle this. This will happen when wrong event type id is used.
  // if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return {
      error: data.message,
    };
  }

  return "Booking created";
};

const createBookingTool = (apiKey: string, userId: number, users: UserList) => {
  return new DynamicStructuredTool({
    description: "Creates a booking on the primary user's calendar.",
    func: async ({ eventTypeId, start, end, timeZone, language, invite, title, status }) => {
      return JSON.stringify(
        await createBooking({
          apiKey,
          userId,
          users,
          end,
          eventTypeId,
          language,
          invite,
          start,
          status,
          timeZone,
          title,
        })
      );
    },
    name: "createBooking",
    schema: z.object({
      end: z
        .string()
        .describe("This should correspond to the event type's length, unless otherwise specified."),
      eventTypeId: z.number(),
      language: z.string(),
      invite: z.number().describe("External user id to invite."),
      start: z.string(),
      status: z.string().optional().describe("ACCEPTED, PENDING, CANCELLED or REJECTED"),
      timeZone: z.string(),
      title: z.string().optional(),
    }),
  });
};

export default createBookingTool;
