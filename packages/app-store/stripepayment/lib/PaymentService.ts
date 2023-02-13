import { Booking, Payment, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmail } from "@calcom/emails";
import { IAbstractPaymentService } from "@calcom/lib/PaymentService";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { CalendarEvent } from "@calcom/types/Calendar";

import { createPaymentLink } from "./client";
import { StripePaymentData } from "./server";

const stripeCredentialKeysSchema = z.object({
  stripe_user_id: z.string(),
  default_currency: z.string(),
  stripe_publishable_key: z.string(),
});

const stripeAppKeysSchema = z.object({
  client_id: z.string(),
  payment_fee_fixed: z.number(),
  payment_fee_percentage: z.number(),
});

export class PaymentService implements IAbstractPaymentService {
  private stripe: Stripe;
  private credentials: z.infer<typeof stripeCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    // parse credentials key
    this.credentials = stripeCredentialKeysSchema.parse(credentials.key);
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "", {
      apiVersion: "2020-08-27",
    });
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ) {
    try {
      // Load stripe keys
      const stripeAppKeys = await prisma?.app.findFirst({
        select: {
          keys: true,
        },
        where: {
          slug: "stripe",
        },
      });

      // Parse keys with zod
      const { client_id, payment_fee_fixed, payment_fee_percentage } = stripeAppKeysSchema.parse(
        stripeAppKeys?.keys
      );
      const paymentFee = Math.round(payment.amount * payment_fee_percentage + payment_fee_fixed);

      const params: Stripe.PaymentIntentCreateParams = {
        amount: payment.amount,
        currency: this.credentials.default_currency,
        payment_method_types: ["card"],
        application_fee_amount: paymentFee,
      };

      const paymentIntent = await this.stripe.paymentIntents.create(params, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      const paymentData = await prisma?.payment.create({
        data: {
          uid: uuidv4(),
          app: {
            connect: {
              slug: "stripe",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: paymentIntent.id,

          data: Object.assign({}, paymentIntent, {
            stripe_publishable_key: this.credentials.stripe_publishable_key,
            stripeAccount: this.credentials.stripe_user_id,
          }) as unknown as Prisma.InputJsonValue,
          fee: paymentFee,
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

      const refund = await this.stripe.refunds.create(
        {
          payment_intent: payment.externalId,
        },
        { stripeAccount: (payment.data as unknown as StripePaymentData)["stripeAccount"] }
      );

      if (!refund || refund.status === "failed") {
        throw new Error("Refund failed");
      }

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
        link: createPaymentLink({
          paymentUid: paymentData.uid,
          name: booking.user?.name,
          email: booking.user?.email,
          date: booking.startTime.toISOString(),
        }),
      },
    });
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }
      const stripeAccount = (payment.data as unknown as StripePaymentData).stripeAccount;

      if (!stripeAccount) {
        throw new Error("Stripe account not found");
      }
      // Expire all current sessions
      const sessions = await this.stripe.checkout.sessions.list(
        {
          payment_intent: payment.externalId,
        },
        { stripeAccount }
      );
      for (const session of sessions.data) {
        await this.stripe.checkout.sessions.expire(session.id, { stripeAccount });
      }
      // Then cancel the payment intent
      await this.stripe.paymentIntents.cancel(payment.externalId, { stripeAccount });
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
