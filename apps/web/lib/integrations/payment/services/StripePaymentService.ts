import { PaymentType, Prisma, Credential } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import { sendAwaitingPaymentEmail } from "@lib/emails/email-manager";
import { getErrorFromUnknown } from "@lib/errors";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import {
  paymentFeeFixed,
  paymentFeePercentage,
  PAYMENT_INTEGRATIONS_TYPES,
} from "@lib/integrations/payment/constants/generals";
import { STRIPE } from "@lib/integrations/payment/constants/stripeConstats";
import { PaymentData } from "@lib/integrations/payment/constants/types";
import {
  BookingDetail,
  BookingRefundDetail,
  PaymentMethodCredential,
  PaymentSelectedEventType,
} from "@lib/integrations/payment/interfaces/PaymentMethod";
import BasePaymentService from "@lib/integrations/payment/services/BasePaymentService";
import { createPaymentLink } from "@lib/integrations/payment/utils/stripeUtils";
import prisma from "@lib/prisma";

export default class StripePaymentService extends BasePaymentService {
  constructor(credential: Credential) {
    super(credential, PAYMENT_INTEGRATIONS_TYPES.stripe);
  }

  async handlePayment(
    event: CalendarEvent,
    selectedEventType: PaymentSelectedEventType,
    credential: PaymentMethodCredential,
    booking: BookingDetail
  ) {
    const paymentFee = Math.round(
      selectedEventType.price * parseFloat(`${paymentFeePercentage}`) + parseInt(`${paymentFeeFixed}`)
    );
    const { stripe_user_id, stripe_publishable_key } = credential.key as Stripe.OAuthToken;

    const params: Stripe.PaymentIntentCreateParams = {
      amount: selectedEventType.price,
      currency: selectedEventType.currency,
      payment_method_types: ["card"],
      application_fee_amount: paymentFee,
    };

    const paymentIntent = await STRIPE.paymentIntents.create(params, { stripeAccount: stripe_user_id });

    const payment = await prisma.payment.create({
      data: {
        type: PaymentType.STRIPE,
        uid: uuidv4(),
        booking: {
          connect: {
            id: booking.id,
          },
        },
        amount: selectedEventType.price,
        fee: paymentFee,
        currency: selectedEventType.currency,
        success: false,
        refunded: false,
        data: Object.assign({}, paymentIntent, {
          stripe_publishable_key,
          stripeAccount: stripe_user_id,
        }) /* We should treat this */ as PaymentData /* but Prisma doesn't know how to handle it, so it we treat it */ as unknown /* and then */ as Prisma.InputJsonValue,
        externalId: paymentIntent.id,
      },
    });

    await sendAwaitingPaymentEmail({
      ...event,
      paymentInfo: {
        link: createPaymentLink({
          paymentUid: payment.uid,
          name: booking.user?.name,
          date: booking.startTime.toISOString(),
        }),
      },
    });

    return payment;
  }

  async refund(booking: BookingRefundDetail, event: CalendarEvent): Promise<void> {
    try {
      const payment = booking.payment.find((e) => e.success && !e.refunded);
      if (!payment) return;

      const refund = await STRIPE.refunds.create(
        {
          payment_intent: payment.externalId,
        },
        { stripeAccount: (payment.data as unknown as PaymentData)["stripeAccount"] }
      );

      if (!refund || refund.status === "failed") {
        await this.handleRefundError({
          event: event,
          reason: refund?.failure_reason || "unknown",
          paymentId: payment.externalId,
        });
        return;
      }

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          refunded: true,
        },
      });
    } catch (e) {
      const err = getErrorFromUnknown(e);
      console.error(err, "Refund failed");
      await this.handleRefundError({
        event: event,
        reason: err.message || "unknown",
        paymentId: "unknown",
      });
    }
  }
}
