import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { shouldHideBrandingForEventWithPrisma } from "@calcom/features/profile/lib/hideBranding";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

export const handleNoShowFee = async ({
  booking,
  payment,
}: {
  booking: {
    id: number;
    uid: string;
    title: string;
    startTime: Date;
    endTime: Date;
    userPrimaryEmail: string | null;
    userId: number | null;
    eventTypeId: number | null;
    user?: {
      id: number;
      email: string;
      name?: string | null;
      locale: string | null;
      timeZone: string;
      hideBranding: boolean;
      organizationId: number | null;
    } | null;
    eventType: {
      title: string;
      hideOrganizerEmail: boolean;
      teamId: number | null;
      team?: {
        id: number;
        hideBranding: boolean;
        parentId: number | null;
        parent: { hideBranding: boolean | null } | null;
      } | null;
      parent?: {
        teamId: number | null;
      } | null;
      metadata?: Prisma.JsonValue;
    } | null;
    attendees: {
      name: string;
      email: string;
      timeZone: string;
      locale: string | null;
    }[];
  };
  payment: {
    id: number;
    amount: number;
    currency: string;
    paymentOption: string | null;
    appId: string | null;
  };
}) => {
  const log = logger.getSubLogger({ prefix: [`[handleNoShowFee] bookingUid ${booking.uid}`] });
  const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

  const userId = booking.userId;
  const teamId = booking.eventType?.teamId;
  const appId = payment.appId;

  const eventTypeMetdata = eventTypeMetaDataSchemaWithTypedApps.parse(booking.eventType?.metadata ?? {});

  if (!userId) {
    log.error("User ID is required");
    throw new Error("User ID is required");
  }

  const bookingAttendee = booking.attendees[0];

  const attendee = {
    name: bookingAttendee.name,
    email: bookingAttendee.email,
    timeZone: bookingAttendee.timeZone,
    language: {
      translate: await getTranslation(bookingAttendee.locale ?? "en", "common"),
      locale: bookingAttendee.locale ?? "en",
    },
  };

  const evt: CalendarEvent = {
    type: (booking?.eventType?.title as string) || booking?.title,
    title: booking.title,
    startTime: dayjs(booking.startTime).format(),
    endTime: dayjs(booking.endTime).format(),
    organizer: {
      email: booking?.userPrimaryEmail ?? booking.user?.email ?? "",
      name: booking.user?.name || "Nameless",
      timeZone: booking.user?.timeZone || "",
      language: { translate: tOrganizer, locale: booking.user?.locale ?? "en" },
    },
    attendees: [attendee],
    hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
    paymentInfo: {
      amount: payment.amount,
      currency: payment.currency,
      paymentOption: payment.paymentOption,
    },
  };

  if (teamId) {
    const userIsInTeam = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId,
    });

    if (!userIsInTeam) {
      log.error(`User ${userId} is not a member of team ${teamId}`);
      throw new Error("User is not a member of the team");
    }
  }
  let paymentCredential = await CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId({
    appId,
    userId,
    teamId,
  });

  if (!paymentCredential && teamId) {
    const teamRepository = new TeamRepository(prisma);
    // See if the team event belongs to an org
    const org = await teamRepository.findParentOrganizationByTeamId(teamId);

    if (org) {
      paymentCredential = await CredentialRepository.findPaymentCredentialByAppIdAndTeamId({
        appId,
        teamId: org.id,
      });
    }
  }

  if (!paymentCredential) {
    log.error(`No payment credential found for user ${userId} or team ${teamId}`);
    throw new Error("No payment credential found");
  }

  const key = paymentCredential?.app?.dirName;
  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    log.error(`Payment app ${key} not implemented`);
    throw new Error("Payment app not implemented");
  }
  const paymentApp = await paymentAppImportFn;
  if (!paymentApp?.PaymentService) {
    log.error(`Payment service not found for app ${key}`);
    throw new Error("Payment service not found");
  }
  const PaymentService = paymentApp.PaymentService;
  const paymentInstance = new PaymentService(paymentCredential) as IAbstractPaymentService;

  try {
    const paymentData = await paymentInstance.chargeCard(payment, booking.id);

    if (!paymentData) {
      log.error(`Error processing payment with paymentId ${payment.id}`);
      throw new Error("Payment processing failed");
    }

    const organizationId = booking.eventType?.team?.parentId ?? booking.user?.organizationId ?? null;

    const hideBranding = await shouldHideBrandingForEventWithPrisma({
      eventTypeId: booking.eventTypeId ?? 0,
      team: booking.eventType?.team ?? null,
      owner: booking.user ?? null,
      organizationId: organizationId,
    });

    await sendNoShowFeeChargedEmail(attendee, { ...evt, hideBranding }, eventTypeMetdata);

    return paymentData;
  } catch (err) {
    let errorMessage = `Error processing paymentId ${payment.id} with error ${err}`;
    if (err instanceof ErrorWithCode && err.code === ErrorCode.ChargeCardFailure) {
      errorMessage = err.message;
    }

    log.error(errorMessage);
    throw new Error(tOrganizer(errorMessage));
  }
};
