import { PaymentType, Prisma } from "@prisma/client";
import getBitcoinAppData from "bitcoin/lib/getBitcoinAppData";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import prisma from "@calcom/prisma";
import { EventTypeModel } from "@calcom/prisma/zod";
import type { CalendarEvent } from "@calcom/types/Calendar";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export type PaymentData = {
  lnInvoice: string;
  stripeAccount: string;
};

export async function handlePayment(
  evt: CalendarEvent,
  selectedEventType: Pick<z.infer<typeof EventTypeModel>, "price" | "currency" | "metadata">,
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime: { toISOString: () => string };
    uid: string;
  }
) {
  const appKeys = await getAppKeysFromSlug("bitcoin");
  const bitcoinAppData = getBitcoinAppData(selectedEventType);

  const paymentIntent =
    /* await getInvoice(Config LN Name, Config LN Price); */ "lnbc1u1p3mjl9xpp527xj0nhfray26nrkd5j8lnkhnltlc3025yx6kghjvt9nnkeselsqdpzgdhkjmjtd96yq4esxqcrqvpsx9tn2vp3xscqzpgxqyz5vqsp52lw0380j6pyys3gwka2j8e2m9fvguyslltzs5gzvdx3h6hf7ywws9qyyssqukxlkd60kmvcxwxdaz7gcuw6tuz4arsp2m5elnklxmttajr9jdkxj40l0ffgkeyz73yhhgj44cczr2weae7sg53dtf3lgjz9h6mhqfsqhsgsuv";

  const payment = await prisma.payment.create({
    data: {
      type: "BITCOIN", // PaymentType.BITCOIN // Needs prisma migration?,
      uid: uuidv4(),
      booking: {
        connect: {
          id: booking.id,
        },
      },
      amount: bitcoinAppData.priceInSats,
      fee: 0,
      currency: "sats",
      success: false,
      refunded: false,
      data: paymentIntent,
      externalId: paymentIntent,
    },
  });

  return payment;
}

export async function refund(
  booking: {
    id: number;
    uid: string;
    startTime: Date;
    payment: {
      id: number;
      success: boolean;
      refunded: boolean;
      externalId: string;
      data: Prisma.JsonValue;
      type: PaymentType;
    }[];
  },
  calEvent: CalendarEvent
) {
  await handleRefundError({
    event: calEvent,
    reason: "cannot refund bitcoin payment",
    paymentId: "unknown",
  });
  return;
}

async function handleRefundError(opts: { event: CalendarEvent; reason: string; paymentId: string }) {
  // Do nothing
}
