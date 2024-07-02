import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmail } from "@calcom/emails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";
import { createPaymentLink } from "./client";
import { retrieveOrCreateStripeCustomerByEmail } from "./customer";
import type { StripePaymentData, StripeSetupIntentData } from "./server";

const log = logger.getSubLogger({ prefix: ["payment-service:stripe"] });

export const stripeCredentialKeysSchema = z.object({
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
  private credentials: z.infer<typeof stripeCredentialKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = stripeCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
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
    userId: Booking["userId"],
    username: string | null,
    bookerName: string,
    bookerEmail: string,
    paymentOption: PaymentOption,
    eventTitle?: string,
    bookingTitle?: string
  ) {
    try {
      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
        throw new Error("Payment option is not compatible with create method");
      }

      if (!this.credentials) {
        throw new Error("Stripe credentials not found");
      }

      const customer = await retrieveOrCreateStripeCustomerByEmail(
        bookerEmail,
        this.credentials.stripe_user_id
      );

      const params: Stripe.PaymentIntentCreateParams = {
        amount: payment.amount,
        currency: payment.currency,
        payment_method_types: ["card"],
        customer: customer.id,
        metadata: {
          identifier: "cal.com",
          bookingId,
          calAccountId: userId,
          calUsername: username,
          bookerName,
          bookerEmail,
          eventTitle: eventTitle || "",
          bookingTitle: bookingTitle || "",
        },
      };

      const paymentIntent = await this.stripe.paymentIntents.create(params, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      const paymentData = await prisma.payment.create({
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
      log.error("Stripe: Payment could not be created", bookingId, safeStringify(error));
      throw new Error("payment_not_created_error");
    }
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    bookerEmail: string,
    paymentOption: PaymentOption
  ): Promise<Payment> {
    try {
      if (!this.credentials) {
        throw new Error("Stripe credentials not found");
      }

      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "HOLD") {
        throw new Error("Payment option is not compatible with create method");
      }

      const customer = await retrieveOrCreateStripeCustomerByEmail(
        bookerEmail,
        this.credentials.stripe_user_id
      );

      const params = {
        customer: customer.id,
        payment_method_types: ["card"],
        metadata: {
          bookingId,
        },
      };

      const setupIntent = await this.stripe.setupIntents.create(params, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      const paymentData = await prisma.payment.create({
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
          externalId: setupIntent.id,
          data: Object.assign(
            {},
            {
              setupIntent,
              stripe_publishable_key: this.credentials.stripe_publishable_key,
              stripeAccount: this.credentials.stripe_user_id,
            }
          ) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
        },
      });

      return paymentData;
    } catch (error) {
      log.error(
        "Stripe: Payment method could not be collected for bookingId",
        bookingId,
        safeStringify(error)
      );
      throw new Error("Stripe: Payment method could not be collected");
    }
  }

  async chargeCard(payment: Payment, _bookingId?: Booking["id"]): Promise<Payment> {
    try {
      if (!this.credentials) {
        throw new Error("Stripe credentials not found");
      }

      const stripeAppKeys = await prisma.app.findFirst({
        select: {
          keys: true,
        },
        where: {
          slug: "stripe",
        },
      });

      const paymentObject = payment.data as unknown as StripeSetupIntentData;

      const setupIntent = paymentObject.setupIntent;

      // Parse keys with zod
      const { payment_fee_fixed, payment_fee_percentage } = stripeAppKeysSchema.parse(stripeAppKeys?.keys);

      const paymentFee = Math.round(payment.amount * payment_fee_percentage + payment_fee_fixed);

      // Ensure that the stripe customer & payment method still exists
      const customer = await this.stripe.customers.retrieve(setupIntent.customer as string, {
        stripeAccount: this.credentials.stripe_user_id,
      });
      const paymentMethod = await this.stripe.paymentMethods.retrieve(setupIntent.payment_method as string, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      if (!customer) {
        throw new Error(`Stripe customer does not exist for setupIntent ${setupIntent.id}`);
      }

      if (!paymentMethod) {
        throw new Error(`Stripe paymentMethod does not exist for setupIntent ${setupIntent.id}`);
      }

      const params = {
        amount: payment.amount,
        currency: payment.currency,
        application_fee_amount: paymentFee,
        customer: setupIntent.customer as string,
        payment_method: setupIntent.payment_method as string,
        off_session: true,
        confirm: true,
      };

      const paymentIntent = await this.stripe.paymentIntents.create(params, {
        stripeAccount: this.credentials.stripe_user_id,
      });

      const paymentData = await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          success: true,
          data: {
            ...paymentObject,
            paymentIntent,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      if (!paymentData) {
        throw new Error();
      }

      return paymentData;
    } catch (error) {
      log.error("Stripe: Could not charge card for payment", _bookingId, safeStringify(error));
      throw new Error(ErrorCode.ChargeCardFailure);
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment> {
    try {
      const payment = await this.getPayment({
        id: paymentId,
        success: true,
        refunded: false,
      });
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
        paymentOption: paymentData.paymentOption || "ON_BOOKING",
        amount: paymentData.amount,
        currency: paymentData.currency,
      },
    });
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      const payment = await this.getPayment({
        id: paymentId,
      });
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
      log.error("Stripe: Unable to delete Payment in stripe of paymentId", paymentId, safeStringify(e));
      return false;
    }
  }

  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}
