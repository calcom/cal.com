import type { Prisma } from "@prisma/client";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { getPlatformParams } from "@calcom/features/platform-oauth-client/get-platform-params";
import { PlatformOAuthClientRepository } from "@calcom/features/platform-oauth-client/platform-oauth-client.repository";
import EventManager, { placeholderCreatedEvent } from "@calcom/lib/EventManager";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getBooking } from "@calcom/lib/payment/getBooking";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { safeStringify } from "@calcom/lib/safeStringify";
import { DistributedTracing } from "@calcom/lib/tracing";
import type { TraceContext } from "@calcom/lib/tracing";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function handleStripePaymentSuccess(event: Stripe.Event, traceContext?: TraceContext) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const webhookMeta = {
    eventType: event.type,
    paymentIntentId: paymentIntent.id,
    stripeEventId: event.id,
  };

  const spanContext = traceContext
    ? DistributedTracing.createSpan(traceContext, "stripe_payment_success", webhookMeta)
    : DistributedTracing.createTrace("stripe_payment_success_fallback", {
        meta: webhookMeta,
      });

  const tracingLogger = DistributedTracing.getTracingLogger(spanContext);

  tracingLogger.info("Processing Stripe payment success webhook", {
    paymentIntentId: paymentIntent.id,
    eventId: event.id,
  });

  const payment = await prisma.payment.findFirst({
    where: {
      externalId: paymentIntent.id,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });

  if (!payment?.bookingId) {
    tracingLogger.error("Stripe: Payment Not Found", {
      paymentIntent: safeStringify(paymentIntent),
      payment: safeStringify(payment),
    });
    throw new HttpCode({ statusCode: 204, message: "Payment not found" });
  }

  await handlePaymentSuccess(payment.id, payment.bookingId, spanContext);
}

const handleSetupSuccess = async (event: Stripe.Event, traceContext?: TraceContext) => {
  const setupIntent = event.data.object as Stripe.SetupIntent;

  const webhookMeta = {
    eventType: event.type,
    setupIntentId: setupIntent.id,
    stripeEventId: event.id,
  };

  const spanContext = traceContext
    ? DistributedTracing.createSpan(traceContext, "stripe_setup_success", webhookMeta)
    : DistributedTracing.createTrace("stripe_setup_success_fallback", {
        meta: webhookMeta,
      });

  const tracingLogger = DistributedTracing.getTracingLogger(spanContext);

  tracingLogger.info("Processing Stripe setup success webhook", {
    setupIntentId: setupIntent.id,
    eventId: event.id,
  });
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: setupIntent.id,
    },
  });

  if (!payment?.data || !payment?.id) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  const { booking, user, evt, eventType } = await getBooking(payment.bookingId);

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
  };

  if (!user) throw new HttpCode({ statusCode: 204, message: "No user found" });

  const requiresConfirmation = doesBookingRequireConfirmation({
    booking: {
      ...booking,
      eventType,
    },
  });

  const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(eventType?.metadata);
  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(user, {
    ...booking.eventType,
    metadata,
  });

  const platformOAuthClientRepository = new PlatformOAuthClientRepository();
  const platformOAuthClient = user.isPlatformManaged
    ? await platformOAuthClientRepository.getByUserId(user.id)
    : null;
  const areCalendarEventsEnabled = platformOAuthClient?.areCalendarEventsEnabled ?? true;
  const areEmailsEnabled = platformOAuthClient?.areEmailsEnabled ?? true;

  if (!requiresConfirmation) {
    const eventManager = new EventManager({ ...user, credentials: allCredentials }, metadata?.apps);
    const scheduleResult = areCalendarEventsEnabled
      ? await eventManager.create(evt)
      : placeholderCreatedEvent;
    bookingData.references = { create: scheduleResult.referencesToCreate };
    bookingData.status = BookingStatus.ACCEPTED;
  }

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      data: {
        ...(payment.data as Prisma.JsonObject),
        setupIntent: setupIntent as unknown as Prisma.JsonObject,
      },
      booking: {
        update: {
          ...bookingData,
        },
      },
    },
  });

  // If the card information was already captured in the same customer. Delete the previous payment method

  if (!requiresConfirmation) {
    await handleConfirmation({
      user: { ...user, credentials: allCredentials },
      evt,
      prisma,
      bookingId: booking.id,
      booking,
      paid: true,
      platformClientParams: platformOAuthClient ? getPlatformParams(platformOAuthClient) : undefined,
      traceContext: spanContext,
    });
  } else if (areEmailsEnabled) {
    await sendOrganizerRequestEmail({ ...evt }, eventType.metadata);
    await sendAttendeeRequestEmailAndSMS({ ...evt }, evt.attendees[0], eventType.metadata);
  }
};

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "payment_intent.succeeded": handleStripePaymentSuccess,
  "setup_intent.succeeded": handleSetupSuccess,
};

/**
 * @deprecated
 * We need to create a PaymentManager in `@calcom/lib`
 * to prevent circular dependencies on App Store migration
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const webhookMeta = {
    method: req.method,
    userAgent: req.headers["user-agent"],
    contentType: req.headers["content-type"],
  };

  const traceContext = DistributedTracing.createTrace("stripe_webhook_handler", {
    meta: webhookMeta,
  });

  const tracingLogger = DistributedTracing.getTracingLogger(traceContext);

  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing stripe-signature" });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpCode({ statusCode: 500, message: "Missing process.env.STRIPE_WEBHOOK_SECRET" });
    }
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();

    const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);

    tracingLogger.info("Stripe webhook event received", {
      eventType: event.type,
      eventId: event.id,
      accountId: event.account,
    });

    // bypassing this validation for e2e tests
    // in order to successfully confirm the payment
    if (!event.account && !process.env.NEXT_PUBLIC_IS_E2E) {
      throw new HttpCode({ statusCode: 202, message: "Incoming connected account" });
    }

    const handler = webhookHandlers[event.type];
    if (handler) {
      await handler(event, traceContext);
    } else {
      /** Not really an error, just letting Stripe know that the webhook was received but unhandled */
      throw new HttpCode({
        statusCode: 202,
        message: `Unhandled Stripe Webhook event type ${event.type}`,
      });
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    tracingLogger.error("Webhook Error", {
      message: err.message,
      statusCode: err.statusCode,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
}
