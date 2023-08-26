import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type Booking from "../types/booking";
import { BOOKING_STATUS } from "../types/booking";
import { decrypt } from "../utils/encryption";

const fetchBookings = async ({
  apiKeyHashed,
  apiKeyIV,
  userId,
  from,
  to,
}: {
  apiKeyHashed: string;
  apiKeyIV: string;
  userId: string;
  from: string;
  to: string;
}) => {
  const params: { [k: string]: string } = {
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
    userId,
  };
  // if (attendeeEmail)
  //     params['attendeeEmail'] = attendeeEmail

  const urlParams = new URLSearchParams(params);
  const url = `${env.BACKEND_URL}/bookings?${urlParams.toString()}`;

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  // console.log('get bookings: ', JSON.stringify(data, null, 2));

  if (response.status !== 200)
    // console.error(data)
    return { error: data.message };

  const bookings = data.bookings
    .filter(
      (booking: Booking) =>
        new Date(booking.startTime).getTime() > new Date(from).getTime() &&
        new Date(booking.endTime).getTime() < new Date(to).getTime() &&
        booking.status !== BOOKING_STATUS.CANCELLED
    )
    .map((booking: Booking) => ({
      endTime: booking.endTime,

      // userId: booking.userId,
      // description: booking.description,
      eventTypeId: booking.eventTypeId,

      id: booking.id,

      startTime: booking.startTime,

      // attendees: booking.attendees,
      // user: booking.user,
      // payment: booking.payment,
      // metadata: booking.metadata,
      status: booking.status,

      // uid: booking.uid,
      title: booking.title,
      // responses: booking.responses,
    }));

  return bookings;
};

const getBookingsTool = new DynamicStructuredTool({
  description: "Get bookings for a user between two dates.",
  func: async ({ apiKeyHashed, apiKeyIV, from, to, userId }) => {
    return JSON.stringify(await fetchBookings({ apiKeyHashed, apiKeyIV, from, to, userId }));
  },
  name: "getBookings",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    from: z.string().describe("ISO 8601 datetime string"),
    to: z.string().describe("ISO 8601 datetime string"),
    userId: z.string(),
    // attendeeEmail: z.string().optional(),
  }),
});

export default getBookingsTool;
