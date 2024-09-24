import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import {
  calculateMaxStartTime,
  getHosts,
  getMeetingSessionsFromRoomName,
  sendWebhookPayload,
} from "./common";
import type { Participants } from "./common";
import { getBooking } from "./getBooking";
import { ZSendNoShowWebhookPayloadSchema } from "./schema";

export async function triggerGuestNoShow(payload: string): Promise<void> {
  const { bookingId, webhook } = ZSendNoShowWebhookPayloadSchema.parse(JSON.parse(payload));

  const dailyVideoReference = booking.references.find((reference) => reference.type === "daily_video");

  if (!dailyVideoReference)
    throw new Error(`Daily video reference not found in triggerHostNoShow with bookingId ${bookingId}`);

  const meetingDetails = await getMeetingSessionsFromRoomName(dailyVideoReference.uid);
  const booking = await getBooking(bookingId);

  const hosts = getHosts(booking);
  const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

  const hostsThatDidntJoinTheCall = hosts.filter(
    (host) => !checkIfUserJoinedTheCall(host.id, allParticipants)
  );

  const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const didGuestJoinTheCall = meetingDetails.data.some(
    (meeting) => meeting.max_participants < numberOfHostsThatJoined
  );

  if (!didGuestJoinTheCall) {
    await sendWebhookPayload(
      webhook,
      WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      booking,
      maxStartTime
    );
  }
}

function checkIfUserJoinedTheCall(userId: string, allParticipants: Participants): boolean {
  return allParticipants.some((participant) => participant.user_id === userId);
}
