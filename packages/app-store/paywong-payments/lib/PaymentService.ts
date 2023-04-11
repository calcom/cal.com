import type { Booking, Payment, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmail } from "@calcom/emails";
import type { IAbstractPaymentService } from "@calcom/lib/PaymentService";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { createPaywongPayment } from "../services/createPayment";

const paywongPaymentsCredentialKeysSchema = z.object({
  app_id: z.string(),
  public_key: z.string(),
  secret_key: z.string(),
});

const eventMetadataSchema = z.object({
  receiverAddress: z.string(),
});

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof paywongPaymentsCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    // parse credentials key
    this.credentials = paywongPaymentsCredentialKeysSchema.parse(credentials.key);
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    eventTypeMetadata?: { [key: string]: string | number | boolean | null }
  ) {
    try {
      const parse = eventMetadataSchema.safeParse(eventTypeMetadata);
      if (!parse.success) {
        throw new Error("Invalid event metadata");
      }
      const { receiverAddress } = parse.data;

      // Create Link here
      const result = await createPaywongPayment({
        amount: payment.amount / 100,
        orderId: bookingId.toString(),
        receiverAddress,
      });
      console.log("result", result);
      const paymentData = await prisma?.payment.create({
        data: {
          uid: uuidv4(),
          app: {
            connect: {
              slug: "paywong-payments",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: "", // TODO: TBD
          data: {}, // TODO: TBD
          fee: 0, // TODO: TBD
          refunded: false,
          success: false,
        },
      });
      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      console.error(error);
      throw new Error("Payment could not be created");
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment> {
    try {
      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
          success: true,
          refunded: false,
        },
      });
      if (!payment) {
        throw new Error("Payment not found");
      }

      // const refund = await this.stripe.refunds.create(
      //   {
      //     payment_intent: payment.externalId,
      //   }
      //   // { stripeAccount: (payment.data as unknown)["stripeAccount"] }
      // );

      // if (!refund || refund.status === "failed") {
      //   throw new Error("Refund failed");
      // }

      const updatedPayment = await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          refunded: true,
        },
      });
      return updatedPayment;
    } catch (e) {
      const err = getErrorFromUnknown(e);
      throw err;
    }
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment
  ): Promise<void> {
    await sendAwaitingPaymentEmail({
      ...event,
      paymentInfo: {
        // link: createPaymentLink({
        //   paymentUid: paymentData.uid,
        //   name: booking.user?.name,
        //   email: booking.user?.email,
        //   date: booking.startTime.toISOString(),
        // }),
      },
    });
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
}
