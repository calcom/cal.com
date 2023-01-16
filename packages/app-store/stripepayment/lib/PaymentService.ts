import { Booking, Payment, PaymentType, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { AbstractPaymentService } from "@calcom/lib/PaymentService";

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

export class PaymentService extends AbstractPaymentService {
  private stripe: Stripe;
  private credentials: z.infer<typeof stripeCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    super();
    console.log({ credentials });
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

      console.log({ stripeAppKeys });
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
          type: PaymentType.STRIPE,
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
  async update(): Payment {
    throw new Error("Method not implemented.");
  }
  async refund(): Payment {
    throw new Error("Method not implemented.");
  }
  getPaymentPaidStatus(): string {
    throw new Error("Method not implemented.");
  }
  getPaymentDetails(): Payment {
    throw new Error("Method not implemented.");
  }
}
