import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import dayjs from "@calcom/dayjs";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { PrismaClient } from "@calcom/prisma";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TChargeCardInputSchema } from "./chargeCard.schema";

interface ChargeCardHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };
  input: TChargeCardInputSchema;
}
export const chargeCardHandler = async ({ ctx, input }: ChargeCardHandlerOptions) => {
  const { prisma } = ctx;
  const teamRepository = new TeamRepository(prisma);

  const booking = await prisma.booking.findUnique({
    where: {
      id: input.bookingId,
    },
    include: {
      payment: true,
      user: true,
      attendees: true,
      eventType: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.payment[0].success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `The no show fee for ${booking.id} has already been charged.`,
    });
  }

  const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

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
      amount: booking.payment[0].amount,
      currency: booking.payment[0].currency,
      paymentOption: booking.payment[0].paymentOption,
    },
  };

  const userId = ctx.user.id;
  const teamId = booking.eventType?.teamId;
  const appId = booking.payment[0].appId;

  if (teamId) {
    const userIsInTeam = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId,
    });

    if (!userIsInTeam) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not in team" });
    }
  }

  let paymentCredential = await CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId({
    appId,
    userId,
    teamId,
  });

  if (!paymentCredential && teamId) {
    // See if the team event belongs to an org
    const org = await teamRepository.findParentOrganizationByTeamId(teamId);

    if (org) {
      paymentCredential = await CredentialRepository.findPaymentCredentialByAppIdAndTeamId({
        appId,
        teamId: org.id,
      });
    }
  }

  if (!paymentCredential?.app) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment credential" });
  }

  const key = paymentCredential?.app?.dirName;
  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment app not implemented" });
  }

  const paymentApp = await paymentAppImportFn;
  if (!paymentApp?.PaymentService) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment service not found" });
  }
  const PaymentService = paymentApp.PaymentService;
  const paymentInstance = new PaymentService(paymentCredential) as IAbstractPaymentService;

  try {
    const paymentData = await paymentInstance.chargeCard(booking.payment[0], booking.id);

    if (!paymentData) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Could not generate payment data` });
    }

    await sendNoShowFeeChargedEmail(
      attendeesListPromises[0],
      evt,
      booking?.eventType?.metadata as EventTypeMetadata
    );

    return paymentData;
  } catch (err) {
    let errorMessage = `Error processing payment with error ${err}`;
    if (err instanceof ErrorWithCode && err.code === ErrorCode.ChargeCardFailure) {
      errorMessage = err.message;
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: tOrganizer(errorMessage),
    });
  }
};
