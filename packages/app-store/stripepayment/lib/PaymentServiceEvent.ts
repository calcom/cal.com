import type { Booking, PaymentOption, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import prisma from "@calcom/prisma";

import { paymentOptionEnum } from "../zod";
import { retrieveOrCreateStripeCustomerByEmail } from "./customer";

const stripeCredentialKeysSchema = z.object({
  stripe_user_id: z.string(),
  default_currency: z.string(),
  stripe_publishable_key: z.string(),
});

// const stripeAppKeysSchema = z.object({
//   client_id: z.string(),
//   payment_fee_fixed: z.number(),
//   payment_fee_percentage: z.number(),
// });

export class PaymentServiceEvent {
  private stripe: Stripe;
  private credentials: z.infer<typeof stripeCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    // parse credentials key
    this.credentials = stripeCredentialKeysSchema.parse(credentials.key);
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "", {
      apiVersion: "2020-08-27",
    });
  }

  private async getPayment(where: Prisma.PaymentWhereInput) {
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new Error("Payment not found");
    if (!payment.externalId) throw new Error("Payment externalId not found");
    return { ...payment, externalId: payment.externalId };
  }

  /* This method is for creating charges at the time of booking */
  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    bookerEmail: string,
    paymentOption: PaymentOption
  ) {
    try {
      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
        throw new Error("Payment option is not compatible with create method");
      }

      // Load stripe keys
      // const stripeAppKeys = await prisma.app.findFirst({
      //   select: {
      //     keys: true,
      //   },
      //   where: {
      //     slug: "stripe",
      //   },
      // });

      const customer = await retrieveOrCreateStripeCustomerByEmail(
        bookerEmail,
        this.credentials.stripe_user_id
      );

      const params: Stripe.PaymentIntentCreateParams = {
        amount: payment.amount,
        currency: this.credentials.default_currency,
        payment_method_types: ["card"],
        customer: customer.id,
      };

      const paymentIntent = await this.stripe.paymentIntents.create(params, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      const paymentData = await prisma.payments.create({
        data: {
          uid: uuidv4(),
          event: {
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
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
        },
      });
      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      console.error(`Payment could not be created for bookingId ${bookingId}`, error);
      throw new Error("Payment could not be created");
    }
  }
}
