import type { Payment, Prisma } from "@prisma/client";
import { t } from "i18next";

import dayjs from "@calcom/dayjs";
import { sendPaymentNotProcessableEmail } from "@calcom/emails";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getPaymentAppData } from "../getPaymentAppData";
import { handlePaymentRefund } from "./handlePaymentRefund";
import { RefundPolicy } from "./types";

export const processPaymentRefund = async ({
  booking,
  teamId,
}: {
  booking: {
    startTime: Date;
    endTime: Date;
    payment: Payment[];
    eventType: {
      owner?: {
        id: number;
      } | null;
      metadata?: Prisma.JsonValue;
    } | null;
  };
  teamId?: number | null;
}) => {
  console.log("Processing payment refund enter");

  const { startTime, eventType, payment } = booking;

  if (!teamId && !eventType?.owner) return;

  const successPayment: Payment = payment.find((p) => p.success);
  if (!successPayment) return;

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata);
  const appData = getPaymentAppData({
    currency: successPayment.currency,
    metadata: eventTypeMetadata,
    price: successPayment.amount,
  });

  console.log("Processing payment refund appData: ", {
    appData,
    eventType,
    payment,
    startTime,
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

  // sendPaymentNotProcessableEmail here

  console.log("Handle payment refund appData: ", appData);
  await handlePaymentRefund(successPayment.id, paymentAppCredential);
};
