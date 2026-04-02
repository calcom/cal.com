import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import dayjs from "@calcom/dayjs";
import { handlePaymentRefund } from "@calcom/features/bookings/lib/payment/handlePaymentRefund";
import { RefundPolicy } from "@calcom/lib/payment/types";
import prisma from "@calcom/prisma";
import type { Payment, Prisma } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

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
  const { startTime, eventType, payment } = booking;
  if (!teamId && !eventType?.owner) return;

  const successPayment = payment.find((p) => p.success);
  if (!successPayment) return;

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
    credentialWhereClause.teamId = teamId;
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

  if (!paymentAppCredential) return;

  const { refundPolicy, refundCountCalendarDays, refundDaysCount } = appData;

  //refundDaysCount would always be present in case DAYS is selected, but adding it in AND jut for type safety
  if (refundPolicy === RefundPolicy.DAYS && refundDaysCount) {
    const refundDeadline =
      refundCountCalendarDays === true
        ? dayjs(startTime).subtract(refundDaysCount, "days")
        : // businessDaysSubtract exists on extended dayjs instance, but ts is messing up
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-expect-error
          dayjs(startTime).businessDaysSubtract(refundDaysCount);
    if (dayjs().isAfter(refundDeadline)) return;
  }
  await handlePaymentRefund(successPayment.id, paymentAppCredential);
};
