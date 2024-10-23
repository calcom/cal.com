import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { DailyLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { getBooking } from "./getBooking";
import { getMeetingSessionsFromRoomName } from "./getMeetingSessionsFromRoomName";
import type { TWebhook, TTriggerNoShowPayloadSchema, TSendNoShowWebhookPayloadSchema } from "./schema";
import { ZSendNoShowWebhookPayloadSchema } from "./schema";

export type Host = {
  id: number;
  email: string;
};

export type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];
export type DestinationCalendar = TSendNoShowWebhookPayloadSchema["destinationCalendar"];

const getGoogleCalendarCredential = async (destinationCalendar: DestinationCalendar) => {
  const credential = await prisma.credential.findUnique({
    where: {
      id: destinationCalendar?.credentialId,
    },
  });

  if (credential) {
    return credential;
  }

  const destinationCalendars = await prisma.destinationCalendar.findMany({
    where: {
      integration: "google_calendar",
      userId: destinationCalendar?.userId,
      externalId: destinationCalendar?.externalId,
    },
  });

  if (!destinationCalendars.length) {
    return null;
  }

  const newCredential = await prisma.credential.findUnique({
    where: {
      id: destinationCalendars[0].credentialId,
    },
  });

  return newCredential;
};

export function getHosts(booking: Booking): Host[] {
  const hostMap = new Map<number, Host>();

  const addHost = (id: number, email: string) => {
    if (!hostMap.has(id)) {
      hostMap.set(id, { id, email });
    }
  };

  booking?.eventType?.hosts?.forEach((host) => addHost(host.userId, host.user.email));
  booking?.eventType?.users?.forEach((user) => addHost(user.id, user.email));

  // Add booking.user if not already included
  if (booking?.user?.id && booking?.user?.email) {
    addHost(booking.user.id, booking.user.email);
  }

  // Filter hosts to only include those who are also attendees
  const attendeeEmails = new Set(booking.attendees?.map((attendee) => attendee.email));
  const filteredHosts = Array.from(hostMap.values()).filter(
    (host) => attendeeEmails.has(host.email) || host.id === booking.user?.id
  );

  return filteredHosts;
}

export function sendWebhookPayload(
  webhook: Webhook,
  triggerEvent: WebhookTriggerEvents,
  booking: Booking,
  maxStartTime: number,
  hostEmail?: string
): Promise<any> {
  const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      endTime: booking.endTime,
      ...(triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ? { email: hostEmail } : {}),
      eventType: {
        ...booking.eventType,
        id: booking.eventTypeId,
      },
      message:
        triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
          ? `Guest didn't join the call or didn't join before ${maxStartTimeHumanReadable}`
          : `Host with email ${hostEmail} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
    },
  }).catch((e) => {
    console.error(
      `Error executing webhook for event: ${triggerEvent}, URL: ${webhook.subscriberUrl}`,
      webhook,
      e
    );
  });
}

export function calculateMaxStartTime(startTime: Date, time: number, timeUnit: TimeUnit): number {
  return dayjs(startTime)
    .add(time, timeUnit.toLowerCase() as dayjs.ManipulateType)
    .unix();
}

export function checkIfUserJoinedTheCall(userId: number, allParticipants: Participants): boolean {
  return allParticipants.some(
    (participant) => participant.user_id && parseInt(participant.user_id) === userId
  );
}

export const log = logger.getSubLogger({ prefix: ["triggerNoShowTask"] });

export const prepareNoShowTrigger = async (
  payload: string
): Promise<{
  booking: Booking;
  webhook: TWebhook;
  hostsThatDidntJoinTheCall: Host[];
  numberOfHostsThatJoined: number;
  didGuestJoinTheCall: boolean;
} | void> => {
  const { bookingId, webhook, destinationCalendar, triggerEvent } = ZSendNoShowWebhookPayloadSchema.parse(
    JSON.parse(payload)
  );

  const booking = await getBooking(bookingId);

  if (booking.status !== BookingStatus.ACCEPTED) {
    log.debug(
      "Booking is not accepted",
      safeStringify({
        bookingId,
        webhook: { id: webhook.id },
      })
    );

    return;
  }

  const hosts = getHosts(booking);

  const dailyVideoReference = booking.references.find((reference) => reference.type === "daily_video");

  if (!!dailyVideoReference || booking.location === DailyLocationType || booking.location?.trim() === "") {
    const meetingDetails = await getMeetingSessionsFromRoomName(dailyVideoReference.uid);

    const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

    const hostsThatDidntJoinTheCall = hosts.filter(
      (host) => !checkIfUserJoinedTheCall(host.id, allParticipants)
    );

    const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

    const didGuestJoinTheCall = meetingDetails.data.some(
      (meeting) => meeting.max_participants < numberOfHostsThatJoined
    );

    return {
      hostsThatDidntJoinTheCall,
      booking,
      numberOfHostsThatJoined,
      webhook,
      didGuestJoinTheCall,
      triggerEvent,
    };
  } else if (booking.location === "integrations:google:meet") {
    const googleCalendarCredentials = await getGoogleCalendarCredential(destinationCalendar);
    if (!googleCalendarCredentials) {
      log.error(
        "No google calendar credentials found",
        safeStringify({
          bookingId,
          webhook: { id: webhook.id },
          destinationCalendar,
        })
      );
      return;
    }

    const calendar = await getCalendar(googleCalendarCredentials);
    const participants = await calendar?.getParticipants(booking.metadata?.videoCallUrl);
    console.log("participants", participants);
  } else {
    log.error(
      "No valid location found in triggerNoShowWebhook",
      safeStringify({
        bookingId,
        webhook: { id: webhook.id },
      })
    );
    throw new Error(`No valid location found in triggerNoShowWebhook with bookingId ${bookingId}`);
  }
};
