import type { Attendee, Payment, Prisma } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { sendPaymentNotProcessableEmail } from "@calcom/emails";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getPaymentAppData } from "../getPaymentAppData";
import { handlePaymentRefund } from "./handlePaymentRefund";
import { RefundPolicy } from "./types";

export type PaymentWithSeatAndAttendee = Prisma.PaymentGetPayload<{
  include: {
    bookingSeat: {
      include: {
        attendee: true;
      };
    };
  };
}>;

export const processPaymentRefund = async ({
  booking,
  attendee,
  teamId,
}: {
  booking: {
    startTime: Date;
    createdAt: Date;
    endTime: Date;
    payment: PaymentWithSeatAndAttendee[];
    responses: any;
    eventType: {
      name: string;
      owner?: {
        id: number;
      } | null;
      metadata?: Prisma.JsonValue;
      hosts: {
        email: string;
        name: string;
      }[];
    } | null;
  };
  attendee: Pick<Attendee, "name" | "email" | "phoneNumber">;
  teamId?: number | null;
}) => {
  const { startTime, eventType, payment } = booking;

  if (!teamId && !eventType?.owner) return;

  const successPayment = payment.find((p) => {
    const success = p.success;

    const seatedBooking = p.bookingSeat;

    if (booking.responses) return success; // If there are booking responses, the booking is not seat-based, so we only check for success

    const hasEmail = seatedBooking.attendee.email;
    const sameEmail = seatedBooking?.attendee?.email === attendee?.email;
    const samePhone = seatedBooking?.attendee?.phoneNumber === attendee?.phoneNumber;

    if (seatedBooking && (hasEmail ? sameEmail : samePhone)) {
      return success;
    }
    return false;
  });
  if (!successPayment) return;

  const paymentDate = successPayment.bookingSeat.createdAt || booking.createdAt;

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata);

  const appData = getPaymentAppData({
    currency: successPayment.currency,
    metadata: eventTypeMetadata,
    price: successPayment.amount,
  });

  if (!appData?.refundPolicy || appData.refundPolicy === RefundPolicy.NEVER) return;

  const credentialWhereClause: Prisma.CredentialFindManyArgs["where"] = {
    appId: successPayment.appId,
  };
  if (eventType?.owner) {
    credentialWhereClause.userId = eventType.owner.id;
  } else if (teamId) {
    credentialWhereClause.calIdTeamId = teamId;
  }

  const paymentAppCredentials = await prisma.credential.findMany({
    where: credentialWhereClause,
    select: {
      key: true,
      appId: true,
      app: {
        select: {
          categories: true,
          dirName: true,
        },
      },
    },
  });

  const paymentAppCredential = paymentAppCredentials.find((credential) => {
    return credential.appId === successPayment.appId;
  });

  console.log("Processing payment paymentAppCredential: ", paymentAppCredential);

  if (!paymentAppCredential) return;

  const { refundPolicy, refundCountCalendarDays, refundDaysCount } = appData;

  //refundDaysCount would always be present in case DAYS is selected, but adding it in AND jut for type safety
  if (refundPolicy === RefundPolicy.DAYS && refundDaysCount) {
    const refundDeadline =
      refundCountCalendarDays === true
        ? dayjs(startTime).subtract(refundDaysCount, "days")
        : // businessDaysSubtract exists on extended dayjs instance, but ts is messing up
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          dayjs(startTime).businessDaysSubtract(refundDaysCount);
    if (dayjs().isAfter(refundDeadline)) return;
  }

  const daysSincePayment = dayjs().diff(dayjs(paymentDate), "days");

  const hosts = eventType?.owner?.id
    ? await prisma.user.findMany({
        where: {
          id: eventType.owner.id,
        },
        select: {
          email: true,
          name: true,
          timeZone: true,
        },
      })
    : null;

  if (daysSincePayment > 180 && hosts && hosts.length > 0) {
    const host = hosts[0];

    const payload = {
      user: {
        name: host.name,
        email: host.email,
        timeZone: host.timeZone,
      },
      attendee: {
        name: attendee.name,
        email: attendee.email,
      },
      booking: {
        title: booking.eventType?.name ?? "NA",
        startTime: booking.startTime,
        amount: successPayment.amount.toString(),
        currency: successPayment.currency,
        paymentDate: paymentDate,
        paymentId: successPayment.externalId,
      },
    };

    await sendPaymentNotProcessableEmail(payload);
  }

  await handlePaymentRefund(successPayment.id, paymentAppCredential);
};
