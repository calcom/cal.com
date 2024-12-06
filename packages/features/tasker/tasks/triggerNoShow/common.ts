import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { getBooking } from "./getBooking";
import { getMeetingSessionsFromRoomName } from "./getMeetingSessionsFromRoomName";
import type { TWebhook, TTriggerNoShowPayloadSchema } from "./schema";
import { ZSendNoShowWebhookPayloadSchema } from "./schema";

type OriginalRescheduledBooking =
  | {
      rescheduledBy?: string | null;
    }
  | null
  | undefined;

export type Host = {
  id: number;
  email: string;
};

export type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];

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
  participants: ParticipantsWithEmail,
  originalRescheduledBooking?: OriginalRescheduledBooking,
  hostEmail?: string
): Promise<any> {
  const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      title: booking.title,
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      attendees: booking.attendees,
      endTime: booking.endTime,
      participants,
      ...(!!hostEmail ? { hostEmail } : {}),
      ...(originalRescheduledBooking ? { rescheduledBy: originalRescheduledBooking.rescheduledBy } : {}),
      eventType: {
        ...booking.eventType,
        id: booking.eventTypeId,
        hosts: undefined,
        users: undefined,
      },
      webhook: {
        ...webhook,
        secret: undefined,
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

const getUserById = async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};

type ParticipantsWithEmail = (Participants[number] & { email?: string })[];

export async function getParticipantsWithEmail(
  allParticipants: Participants
): Promise<ParticipantsWithEmail> {
  const participantsWithEmail = await Promise.all(
    allParticipants.map(async (participant) => {
      if (!participant.user_id) return participant;

      const user = await getUserById(parseInt(participant.user_id));
      return { ...participant, email: user?.email };
    })
  );

  return participantsWithEmail;
}

export const log = logger.getSubLogger({ prefix: ["triggerNoShowTask"] });

export const prepareNoShowTrigger = async (
  payload: string
): Promise<{
  booking: Booking;
  webhook: TWebhook;
  hostsThatDidntJoinTheCall: Host[];
  hostsThatJoinedTheCall: Host[];
  numberOfHostsThatJoined: number;
  didGuestJoinTheCall: boolean;
  originalRescheduledBooking?: OriginalRescheduledBooking;
  participants: ParticipantsWithEmail;
} | void> => {
  const { bookingId, webhook } = ZSendNoShowWebhookPayloadSchema.parse(JSON.parse(payload));

  const booking = await getBooking(bookingId);
  let originalRescheduledBooking = null;

  if (booking.fromReschedule) {
    originalRescheduledBooking = await prisma.booking.findFirst({
      where: {
        uid: booking.fromReschedule,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      select: {
        rescheduledBy: true,
      },
    });
  }

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

  const dailyVideoReference =
    booking.references?.filter((reference) => reference.type === "daily_video")?.pop() ?? null;

  if (!dailyVideoReference) {
    log.error(
      "Daily video reference not found",
      safeStringify({
        bookingId,
        webhook: { id: webhook.id },
      })
    );
    throw new Error(`Daily video reference not found in triggerHostNoShow with bookingId ${bookingId}`);
  }
  const meetingDetails = await getMeetingSessionsFromRoomName(dailyVideoReference.uid);

  const hosts = getHosts(booking);
  const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

  const hostsThatJoinedTheCall: Host[] = [];
  const hostsThatDidntJoinTheCall: Host[] = [];

  for (const host of hosts) {
    if (checkIfUserJoinedTheCall(host.id, allParticipants)) {
      hostsThatJoinedTheCall.push(host);
    } else {
      hostsThatDidntJoinTheCall.push(host);
    }
  }

  const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

  const didGuestJoinTheCall = meetingDetails.data.some(
    (meeting) => meeting.max_participants < numberOfHostsThatJoined
  );

  const participantsWithEmail = await getParticipantsWithEmail(allParticipants);

  return {
    hostsThatDidntJoinTheCall,
    hostsThatJoinedTheCall,
    booking,
    numberOfHostsThatJoined,
    webhook,
    didGuestJoinTheCall,
    originalRescheduledBooking,
    participants: participantsWithEmail,
  };
};
