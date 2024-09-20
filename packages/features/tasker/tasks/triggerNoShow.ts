import { z } from "zod";

import { fetcher } from "@calcom/lib/dailyApiFetcher";
import { getBooking } from "@calcom/web/lib/daily-webhook/getBooking";
import { getBookingReference } from "@calcom/web/lib/daily-webhook/getBookingReference";

const sendNoShowWebhookPayloadSchema = z.object({
  roomName: z.string(),
});

const triggerNoShowPayloadSchema = z.object({
  total_count: z.number(),
  data: z.array(
    z
      .object({
        id: z.string(),
        room: z.string(),
        start_time: z.string(),
        duration: z.number(),
        max_participants: z.number(),
        participants: z.array(
          z.object({
            user_id: z.string(),
            participant_id: z.string(),
            user_name: z.string(),
            join_time: z.number(),
            duration: z.number(),
          })
        ),
      })
      .passthrough()
  ),
});

export const getMeetingSessionsFromRoomName = (roomName: string) => {
  return fetcher(`meetings?room=${roomName}`).then(getMeetingSessionsResponseSchema.parse);
};

export async function triggerNoShow(payload: string): Promise<void> {
  try {
    const { roomName } = triggerNoShowPayloadSchema.parse(JSON.parse(payload));
    const meetingDetails = await getMeetingSessionsFromRoomName(roomName);

    // Check for Guest No show and Host No show

    const bookingReference = await getBookingReference(room_name);

    const booking = await getBooking(bookingReference.bookingId as number);

    const teamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: eventType?.teamId ?? null },
        parentId: eventType?.parentId || eventType?.parent?.id || null,
      },
    });

    // trigger webhook

    // trigger workflow

    const test = "test";
  } catch (error) {
    console.error(error);
    throw error;
  }
}
