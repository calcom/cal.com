import dayjs from "@calcom/dayjs";
import { getHostsAndGuests } from "@calcom/features/bookings/lib/getHostsAndGuests";
import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
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

export type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];
type ParticipantsWithEmail = (Participants[number] & { email?: string; isLoggedIn?: boolean })[];

export function sendWebhookPayload(
  webhook: Webhook,
  triggerEvent: WebhookTriggerEvents,
  booking: Booking & { guests?: Booking["attendees"] },
  maxStartTime: number,
  participants: ParticipantsWithEmail,
  originalRescheduledBooking?: OriginalRescheduledBooking,
  hostEmail?: string
): Promise<{ ok: boolean; status: number } | void> {
  const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook: {
      subscriberUrl: webhook.subscriberUrl,
      appId: webhook.appId,
      payloadTemplate: webhook.payloadTemplate,
      version: webhook.version,
    },
    data: {
      title: booking.title,
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      attendees: booking.attendees,
      endTime: booking.endTime,
      participants,
      ...(hostEmail ? { hostEmail } : {}),
      ...(triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
        ? { noShowHost: booking.noShowHost }
        : {}),
      ...(triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW && booking.guests
        ? { guests: booking.guests }
        : {}),
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

function checkIfHostJoinedTheCall(email: string, allParticipants: ParticipantsWithEmail): boolean {
  return allParticipants.some(
    (participant) => participant.email && participant.isLoggedIn && participant.email === email
  );
}

function checkIfGuestJoinedTheCall(email: string, allParticipants: ParticipantsWithEmail): boolean {
  return allParticipants.some((participant) => participant.email && participant.email === email);
}

const getUserOrGuestById = async (id: string) => {
  // Try User table (numeric IDs)
  if (!isNaN(Number(id))) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { email: true },
    });
    if (user) return { email: user.email, isLoggedIn: true };
  }

  // Try VideoCallGuest table (UUID)
  const guestSession = await prisma.videoCallGuest
    .findUnique({
      where: { id },
      select: { email: true },
    })
    .catch(() => null);

  return { email: guestSession?.email, isLoggedIn: false };
};

export async function getParticipantsWithEmail(
  allParticipants: Participants
): Promise<ParticipantsWithEmail> {
  const participantsWithEmail = await Promise.all(
    allParticipants.map(async (participant) => {
      if (!participant.user_id) return participant;

      const { email, isLoggedIn } = await getUserOrGuestById(participant.user_id);
      return { ...participant, email, isLoggedIn };
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
  hosts: Host[];
  hostsThatDidntJoinTheCall: Host[];
  hostsThatJoinedTheCall: Host[];
  numberOfHostsThatJoined: number;
  didGuestJoinTheCall: boolean;
  guestsThatJoinedTheCall: { email: string; name: string }[];
  guestsThatDidntJoinTheCall: { email: string; name: string }[];
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

  const { hosts, guests } = getHostsAndGuests(booking);
  const allParticipants = meetingDetails.data.flatMap((meeting) => meeting.participants);

  const participantsWithEmail = await getParticipantsWithEmail(allParticipants);
  const hostsThatJoinedTheCall: Host[] = [];
  const hostsThatDidntJoinTheCall: Host[] = [];

  for (const host of hosts) {
    if (checkIfHostJoinedTheCall(host.email, participantsWithEmail)) {
      hostsThatJoinedTheCall.push(host);
    } else {
      hostsThatDidntJoinTheCall.push(host);
    }
  }

  const numberOfHostsThatJoined = hosts.length - hostsThatDidntJoinTheCall.length;

  const requireEmailForGuests = booking.eventType?.calVideoSettings?.requireEmailForGuests ?? false;

  let didGuestJoinTheCall: boolean;
  const guestsThatJoinedTheCall: { email: string; name: string }[] = [];
  const guestsThatDidntJoinTheCall: { email: string; name: string }[] = [];

  if (requireEmailForGuests) {
    for (const guest of guests) {
      if (checkIfGuestJoinedTheCall(guest.email, participantsWithEmail)) {
        guestsThatJoinedTheCall.push(guest);
      } else {
        guestsThatDidntJoinTheCall.push(guest);
      }
    }
    didGuestJoinTheCall = guestsThatJoinedTheCall.length > 0;
  } else {
    didGuestJoinTheCall = meetingDetails.data.some(
      (meeting) => meeting.max_participants > numberOfHostsThatJoined
    );
  }

  return {
    hosts,
    hostsThatDidntJoinTheCall,
    hostsThatJoinedTheCall,
    booking,
    numberOfHostsThatJoined,
    webhook,
    didGuestJoinTheCall,
    guestsThatJoinedTheCall,
    guestsThatDidntJoinTheCall,
    originalRescheduledBooking,
    participants: participantsWithEmail,
  };
};
