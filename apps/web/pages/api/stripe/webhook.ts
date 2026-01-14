import type { Prisma } from "@prisma/client";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import stripe from "./server";
import { getPlatformParams } from "@calcom/features/platform-oauth-client/get-platform-params";
import { PlatformOAuthClientRepository } from "@calcom/features/platform-oauth-client/platform-oauth-client.repository";
import EventManager, { placeholderCreatedEvent } from "@calcom/lib/EventManager";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getBooking } from "@calcom/lib/payment/getBooking";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

const webhookLogger = logger.getSubLogger({ prefix: ["[paymentWebhook]"] });

export const config = {
  api: {
    bodyParser: false,
  },
};

class PaymentRecordNotFoundError extends HttpCode {
  constructor() {
    super({ statusCode: 204, message: "Payment not found" });
  }
}

class UserNotFoundError extends HttpCode {
  constructor() {
    super({ statusCode: 204, message: "No user found" });
  }
}

class StripeWebhookProcessor {
  private async retrievePaymentByExternalId(externalId: string) {
    return prisma.payment.findFirst({
      where: { externalId },
      select: { id: true, bookingId: true },
    });
  }

  private async retrieveFullPaymentRecord(externalId: string) {
    return prisma.payment.findFirst({
      where: { externalId },
    });
  }

  async handlePaymentIntentCompletion(intentData: Stripe.PaymentIntent) {
    const record = await this.retrievePaymentByExternalId(intentData.id);

    if (!record?.bookingId) {
      webhookLogger.error("Stripe: Payment Not Found", safeStringify(intentData), safeStringify(record));
      throw new PaymentRecordNotFoundError();
    }

    return handlePaymentSuccess(record.id, record.bookingId);
  }

  async handleSetupIntentCompletion(intentData: Stripe.SetupIntent) {
    const record = await this.retrieveFullPaymentRecord(intentData.id);

    if (!record?.data || !record?.id) {
      throw new PaymentRecordNotFoundError();
    }

    const bookingContext = await getBooking(record.bookingId);
    
    if (!bookingContext.user) {
      throw new UserNotFoundError();
    }

    await this.processSetupIntentForBooking(record, intentData, bookingContext);
  }

  private async processSetupIntentForBooking(
    record: NonNullable<Awaited<ReturnType<typeof this.retrieveFullPaymentRecord>>>,
    intentData: Stripe.SetupIntent,
    context: Awaited<ReturnType<typeof getBooking>>
  ) {
    const { booking, user, evt, eventType } = context;
    const parsedMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(eventType?.metadata);
    
    const credentials = await getAllCredentialsIncludeServiceAccountKey(user, {
      ...booking.eventType,
      metadata: parsedMetadata,
    });

    const platformConfig = await this.resolvePlatformConfiguration(user.id, user.isPlatformManaged);
    const requiresManualApproval = doesBookingRequireConfirmation({ booking: { ...booking, eventType } });

    const bookingUpdates = await this.prepareBookingUpdates(
      requiresManualApproval,
      { ...user, credentials },
      evt,
      parsedMetadata,
      platformConfig.calendarEventsEnabled
    );

    await this.persistPaymentAndBookingUpdates(record.id, record.data, intentData, bookingUpdates);

    await this.executePostUpdateActions(
      requiresManualApproval,
      platformConfig,
      { ...user, credentials },
      evt,
      booking,
      eventType.metadata
    );
  }

  private async resolvePlatformConfiguration(userId: number, isPlatformManaged: boolean) {
    if (!isPlatformManaged) {
      return {
        client: null,
        calendarEventsEnabled: true,
        emailsEnabled: true,
      };
    }

    const repo = new PlatformOAuthClientRepository();
    const client = await repo.getByUserId(userId);
    
    return {
      client,
      calendarEventsEnabled: client?.areCalendarEventsEnabled ?? true,
      emailsEnabled: client?.areEmailsEnabled ?? true,
    };
  }

  private async prepareBookingUpdates(
    requiresApproval: boolean,
    userWithCredentials: any,
    evt: any,
    metadata: any,
    calendarEnabled: boolean
  ): Promise<Prisma.BookingUpdateInput> {
    const updates: Prisma.BookingUpdateInput = { paid: true };

    if (requiresApproval) {
      return updates;
    }

    const mgr = new EventManager(userWithCredentials, metadata?.apps);
    const result = calendarEnabled ? await mgr.create(evt) : placeholderCreatedEvent;

    return {
      ...updates,
      references: { create: result.referencesToCreate },
      status: BookingStatus.ACCEPTED,
    };
  }

  private async persistPaymentAndBookingUpdates(
    paymentId: number,
    existingData: any,
    intentData: Stripe.SetupIntent,
    bookingUpdates: Prisma.BookingUpdateInput
  ) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        data: {
          ...(existingData as Prisma.JsonObject),
          setupIntent: intentData as unknown as Prisma.JsonObject,
        },
        booking: { update: bookingUpdates },
      },
    });
  }

  private async executePostUpdateActions(
    requiresApproval: boolean,
    platformConfig: Awaited<ReturnType<typeof this.resolvePlatformConfiguration>>,
    userWithCredentials: any,
    evt: any,
    booking: any,
    eventMetadata: any
  ) {
    if (requiresApproval) {
      await this.sendApprovalNotifications(platformConfig.emailsEnabled, evt, eventMetadata);
      return;
    }
    
    await this.confirmBooking(userWithCredentials, evt, booking, platformConfig.client);
  }

  private async sendApprovalNotifications(emailsEnabled: boolean, evt: any, metadata: any) {
    if (!emailsEnabled) return;

    await sendOrganizerRequestEmail({ ...evt }, metadata);
    await sendAttendeeRequestEmailAndSMS({ ...evt }, evt.attendees[0], metadata);
  }

  private async confirmBooking(userWithCredentials: any, evt: any, booking: any, platformClient: any) {
    await handleConfirmation({
      user: userWithCredentials,
      evt,
      prisma,
      bookingId: booking.id,
      booking,
      paid: true,
      platformClientParams: platformClient ? getPlatformParams(platformClient) : undefined,
    });
  }
}

class StripeWebhookValidator {
  validateHttpMethod(method: string | undefined) {
    if (method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
  }

  validateSignature(signature: string | string[] | undefined) {
    if (!signature) {
      throw new HttpCode({ statusCode: 400, message: "Missing stripe-signature" });
    }
    return signature;
  }

  validateWebhookSecret(secret: string | undefined) {
    if (!secret) {
      throw new HttpCode({ statusCode: 500, message: "Missing process.env.STRIPE_WEBHOOK_SECRET" });
    }
    return secret;
  }

  validateEventAccount(hasAccount: boolean, isE2E: boolean) {
    if (!hasAccount && !isE2E) {
      throw new HttpCode({ statusCode: 202, message: "Incoming connected account" });
    }
  }
}

async function parseStripeWebhookEvent(req: NextApiRequest): Promise<Stripe.Event> {
  const validator = new StripeWebhookValidator();
  
  validator.validateHttpMethod(req.method);
  const sig = validator.validateSignature(req.headers["stripe-signature"]);
  const secret = validator.validateWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET);

  const rawBody = await buffer(req);
  const textBody = rawBody.toString();

  return stripe.webhooks.constructEvent(textBody, sig, secret);
}

async function dispatchStripeEvent(evt: Stripe.Event) {
  const processor = new StripeWebhookProcessor();

  const eventTypeMap: Record<string, () => Promise<void>> = {
    "payment_intent.succeeded": async () => {
      await processor.handlePaymentIntentCompletion(evt.data.object as Stripe.PaymentIntent);
    },
    "setup_intent.succeeded": async () => {
      await processor.handleSetupIntentCompletion(evt.data.object as Stripe.SetupIntent);
    },
  };

  const handler = eventTypeMap[evt.type];

  if (!handler) {
    throw new HttpCode({
      statusCode: 202,
      message: `Unhandled Stripe Webhook event type ${evt.type}`,
    });
  }

  await handler();
}

export async function handleStripePaymentSuccess(event: Stripe.Event) {
  const processor = new StripeWebhookProcessor();
  await processor.handlePaymentIntentCompletion(event.data.object as Stripe.PaymentIntent);
}

/**
 * @deprecated
 * We need to create a PaymentManager in `@calcom/lib`
 * to prevent circular dependencies on App Store migration
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsedEvent = await parseStripeWebhookEvent(req);
    
    const validator = new StripeWebhookValidator();
    validator.validateEventAccount(!!parsedEvent.account, !!process.env.NEXT_PUBLIC_IS_E2E);

    await dispatchStripeEvent(parsedEvent);

    res.json({ received: true });
  } catch (err) {
    const error = getErrorFromUnknown(err);
    console.error(`Webhook Error: ${error.message}`);
    
    res.status(error.statusCode ?? 500).send({
      message: error.message,
      stack: IS_PRODUCTION ? undefined : error.stack,
    });
  }
}