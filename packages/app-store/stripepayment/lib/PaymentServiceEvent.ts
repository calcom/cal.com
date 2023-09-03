import type { Booking, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import prisma from "@calcom/prisma";

//import { retrieveOrCreateStripeCustomerByEmail } from "./customer";

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
  //private credentials: z.infer<typeof stripeCredentialKeysSchema>;

  constructor() {
    console.log(process.env.STRIPE_PRIVATE_KEY);
    // parse credentials key
    //this.credentials = stripeCredentialKeysSchema.parse(credentials.key);
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "", {
      apiVersion: "2020-08-27",
    });
  }

  // private async getPayment(where: Prisma.PaymentWhereInput) {
  //   const payment = await prisma.payment.findFirst({ where });
  //   if (!payment) throw new Error("Payment not found");
  //   if (!payment.externalId) throw new Error("Payment externalId not found");
  //   return { ...payment, externalId: payment.externalId };
  // }

  /* This method is for creating charges at the time of booking */
  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount">,
    bookingId: Booking["id"],
    bookerEmail: string,
    title: string
  ) {
    try {
      // Ensure that the payment service can support the passed payment option
      // Load stripe keys
      // const stripeAppKeys = await prisma.app.findFirst({
      //   select: {
      //     keys: true,
      //   },
      //   where: {
      //     slug: "stripe",
      //   },
      // });

      // const customer = await retrieveOrCreateStripeCustomerByEmail(
      //   bookerEmail,
      //   this.credentials.stripe_user_id
      // );

      // const params: Stripe.PaymentIntentCreateParams = {
      //   amount: payment.amount,
      //   currency: this.credentials.default_currency,
      //   payment_method_types: ["card"],
      //   customer: customer.id,
      // };
      const params: Stripe.Checkout.SessionCreateParams = {
        submit_type: "pay",
        payment_method_types: ["card"],
        mode: "payment",
        allow_promotion_codes: true,
        client_reference_id: bookingId.toString(),
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: title,
              },
              unit_amount: payment.amount,
            },
            quantity: 1,
          },
        ],

        success_url: `http://localhost:3000/event-types/${bookingId}`,
        cancel_url: `http://localhost:3000`,
      };
      // const paymentIntent = await this.stripe.paymentIntents.create(params, {
      //   stripeAccount: this.credentials.stripe_user_id,
      // });
      const checkoutSession: Stripe.Checkout.Session = await this.stripe.checkout.sessions.create(params);
      console.log("cccccccccccccc");
      console.log(checkoutSession);
      if (!checkoutSession) {
        throw new Error();
      }
      const paymentData = await prisma.payments.create({
        data: {
          uid: uuidv4(),
          event: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: "usd",
          externalId: String(checkoutSession?.payment_intent) as string,
          data: Object.assign({}, checkoutSession) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: "ON_BOOKING",
        },
      });
      if (!paymentData) {
        throw new Error();
      }
      return checkoutSession.id;
    } catch (error) {
      console.error(`Payment could not be created for bookingId ${bookingId}`, error);
      throw new Error("Payment could not be created");
    }
  }
}
