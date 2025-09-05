import type { Prisma } from "@prisma/client";

// eslint-disable-next-line
import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import dayjs from "@calcom/dayjs";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
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
    user?: {
      email: string;
      name?: string | null;
      locale: string | null;
      timeZone: string;
    } | null;
    eventType: {
      title: string;
      hideOrganizerEmail: boolean;
      teamId: number | null;
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

  const attendeesListPromises = [];

  for (const attendee of booking.attendees) {
    const attendeeObject = {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };

    attendeesListPromises.push(attendeeObject);
  }

  const attendeesList = await Promise.all(attendeesListPromises);

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
    attendees: attendeesList,
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

    await sendNoShowFeeChargedEmail(attendeesListPromises[0], evt, eventTypeMetdata);

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
