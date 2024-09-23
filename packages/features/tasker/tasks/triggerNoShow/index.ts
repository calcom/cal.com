import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import {
  getHosts,
  calculateMaxStartTime,
  getMeetingSessionsFromRoomName,
  sendWebhookPayload,
} from "./common";
import { getBooking } from "./getBooking";
import type { TTriggerNoShowPayloadSchema } from "./schema";
import { sendNoShowWebhookPayloadSchema } from "./schema";

type Participants = TTriggerNoShowPayloadSchema["data"]["participants"];

function checkIfUserJoinedTheCallBeforeMaxStartTime(
  userId: string,
  allParticipants: Participants,
  maxStartTime: number
): boolean {
  return allParticipants.some(
    (participant) => participant.user_id === userId && participant.join_time < maxStartTime
  );
}

export async function triggerNoShow(payload: string): Promise<void> {
  try {
    const { roomName, bookingId, allNoShowWebhooks, allNoShowWorkflows } =
      sendNoShowWebhookPayloadSchema.parse(JSON.parse(payload));
    const meetingDetails = await getMeetingSessionsFromRoomName(roomName);

    // Check for Guest No show and Host No show
    const booking = await getBooking(bookingId);

    const hosts = getHosts(booking);
    const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

    const webhookPromises = allNoShowWebhooks.flatMap((webhook) => {
      const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);
      const hostsThatDidntJoinTheCall = hosts.filter(
        (host) => !checkIfUserJoinedTheCallBeforeMaxStartTime(host.id, allParticipants, maxStartTime)
      );

      const hostsNoShowPromises = webhook.eventTriggers.includes(AFTER_HOSTS_DAILY_NO_SHOW)
        ? hostsThatDidntJoinTheCall.map((host) =>
            sendWebhookPayload(
              webhook,
              WEBHOOK_TRIGGER_EVENTS.AFTER_HOSTS_DAILY_NO_SHOW,
              booking,
              roomName,
              maxStartTime,
              host.email
            )
          )
        : [];

      const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

      const didGuestJoinTheCall = meetingDetails.data.some(
        (meeting) => meeting.max_participants < numberOfHostsThatJoined
      );

      const guestNoShowPromises =
        !didGuestJoinTheCall &&
        webhook.eventTriggers.includes(WEBHOOK_TRIGGER_EVENTS.AFTER_GUESTS_DAILY_NO_SHOW)
          ? [
              sendWebhookPayload(
                webhook,
                WEBHOOK_TRIGGER_EVENTS.AFTER_GUESTS_DAILY_NO_SHOW,
                booking,
                roomName,
                maxStartTime
              ),
            ]
          : [];

      return [...hostsNoShowPromises, ...guestNoShowPromises];
    });

    await Promise.all(webhookPromises);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
