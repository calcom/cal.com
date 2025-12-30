import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { shouldHideBrandingForEvent } from "@calcom/lib/hideBranding";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

export type PaymentPageProps = inferSSRProps<typeof getServerSideProps>;

const querySchema = z.object({
  uid: z.string(),
});

const CANCELLED_OR_REJECTED_STATUSES = [BookingStatus.CANCELLED, BookingStatus.REJECTED];

type PaymentRecord = Awaited<ReturnType<typeof fetchPaymentRecord>>;
type BookingWithEventType = NonNullable<PaymentRecord>["booking"];

async function fetchPaymentRecord(uid: string) {
  return prisma.payment.findUnique({
    where: { uid },
    select: paymentDataSelect,
  });
}

function serializeBookingDates(booking: NonNullable<BookingWithEventType>) {
  const { startTime, endTime, ...rest } = booking;
  
  return {
    ...rest,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
  };
}

function isBookingTerminal(status: BookingStatus): boolean {
  return CANCELLED_OR_REJECTED_STATUSES.includes(status);
}

function determineProfileName(hasTeamName: boolean, teamName: string | null, userName: string | null) {
  return hasTeamName ? teamName : userName;
}

function determineTheme(hasTeamName: boolean, userTheme: string | null) {
  return hasTeamName ? null : userTheme;
}

function resolveUserFromEventType(eventType: NonNullable<BookingWithEventType>["eventType"]) {
  if (!eventType) return null;
  
  const hasUsers = eventType.users.length > 0;
  
  return hasUsers
    ? eventType.users[0]
    : { name: null, theme: null, hideBranding: null, username: null };
}

function isEventTypeValid(eventType: NonNullable<BookingWithEventType>["eventType"]) {
  if (!eventType) return false;
  
  const hasUsersOrTeam = eventType.users.length > 0 || eventType.calIdTeam !== null;
  return hasUsersOrTeam;
}

async function constructProfileData(
  eventType: NonNullable<BookingWithEventType>["eventType"],
  user: ReturnType<typeof resolveUserFromEventType>,
  organizationId: number | null
) {
  if (!eventType || !user) {
    return { name: null, theme: null, hideBranding: false };
  }

  const hasTeam = !!eventType.team?.name;
  
  const profileName = determineProfileName(hasTeam, eventType.team?.name ?? null, user.name);
  const profileTheme = determineTheme(hasTeam, user.theme);
  
  const hideBranding = await shouldHideBrandingForEvent({
    eventTypeId: eventType.id,
    team: eventType.team,
    owner: eventType.users[0] ?? null,
    organizationId,
  });

  return {
    name: profileName,
    theme: profileTheme,
    hideBranding,
  };
}

function extractSessionOrganizationId(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user) return null;
  
  return session.user.profile?.organizationId ?? session.user.org?.id ?? null;
}

function restructurePaymentData(rawPayment: NonNullable<PaymentRecord>) {
  const { data, booking, ...paymentFields } = rawPayment;
  
  return {
    ...paymentFields,
    data: data as Record<string, unknown>,
  };
}

function buildBookingRedirect(bookingUid: string) {
  return {
    redirect: {
      destination: `/booking/${bookingUid}`,
      permanent: false,
    },
  } as const;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { uid } = querySchema.parse(context.query);
  
  const [session, rawPayment] = await Promise.all([
    getServerSession({ req: context.req }),
    fetchPaymentRecord(uid),
  ]);

  if (!rawPayment) {
    return { notFound: true } as const;
  }

  const { booking: rawBooking } = rawPayment;
  
  if (!rawBooking) {
    return { notFound: true } as const;
  }

  const { eventType } = rawBooking;
  
  if (!isEventTypeValid(eventType)) {
    return { notFound: true } as const;
  }

  if (isBookingTerminal(rawBooking.status as BookingStatus)) {
    return buildBookingRedirect(rawBooking.uid);
  }

  const user = resolveUserFromEventType(eventType);
  const orgId = extractSessionOrganizationId(session);
  const profile = await constructProfileData(eventType, user, orgId);

  const payment = restructurePaymentData(rawPayment);
  const booking = serializeBookingDates(rawBooking);
  const secret = getClientSecretFromPayment(payment);

  return {
    props: {
      user,
      eventType: {
        ...eventType,
        metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      },
      booking,
      payment,
      clientSecret: secret,
      profile,
    },
  };
};