import type { Booking, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

export class PaymentServiceEvent {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "", {
      apiVersion: "2020-08-27",
    });
  }
  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount">,
    bookingId: Booking["id"],
    bookerEmail: string,
    title: string,
    slug: string,
    username: string
  ) {
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        submit_type: "pay",
        payment_method_types: ["card"],
        mode: "payment",
        allow_promotion_codes: true,
        client_reference_id: bookingId.toString(),
        customer_email: bookerEmail,
        payment_intent_data: {
          metadata: {
            secret: slug,
          },
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: title,
              },
              unit_amount: payment.amount * 100,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Beenthere Fees",
              },
              unit_amount: payment.amount * 100 * 0.2,
            },
            quantity: 1,
          },
        ],

        success_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/event-types/${bookingId}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/event-types/?dialog=new&eventPage=${username}`,
      };

      const checkoutSession: Stripe.Checkout.Session = await this.stripe.checkout.sessions.create(params);
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
