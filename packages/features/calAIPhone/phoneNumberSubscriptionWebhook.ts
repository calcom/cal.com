import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { CHECKOUT_SESSION_TYPES } from "@calcom/features/ee/billing/constants";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const querySchema = z.object({
  session_id: z.string().min(1),
});
const log = logger.getSubLogger({ prefix: ["[calAIPhone] subscription/success"] });

const checkoutSessionMetadataSchema = z.object({
  userId: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().optional(),
  eventTypeId: z.coerce.number().int().positive().optional(),
  agentId: z.string().optional(),
  workflowId: z.string().optional(),
  type: z.literal(CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION),
});

type CheckoutSessionMetadata = z.infer<typeof checkoutSessionMetadataSchema>;

async function handler(request: NextRequest) {
  try {
    const { session_id } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const checkoutSession = await getCheckoutSession(session_id);
    const metadata = validateAndExtractMetadata(checkoutSession);

    return redirectToSuccess(metadata);
  } catch (error) {
    return handleError(error);
  }
}

async function getCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (!session) {
    throw new HttpError({ statusCode: 404, message: "Checkout session not found" });
  }
  return session;
}

function validateAndExtractMetadata(session: Stripe.Checkout.Session): CheckoutSessionMetadata {
  if (session.payment_status !== "paid") {
    throw new HttpError({ statusCode: 402, message: "Payment required" });
  }
  if (!session.subscription) {
    throw new HttpError({ statusCode: 400, message: "No subscription found in checkout session" });
  }

  const result = checkoutSessionMetadataSchema.safeParse(session.metadata);
  if (!result.success) {
    log.error(`Invalid checkout session metadata: ${safeStringify(result.error.issues)}`);
    throw new HttpError({
      statusCode: 400,
      message: "Invalid checkout session metadata",
    });
  }

  return result.data;
}

function redirectToSuccess(metadata: CheckoutSessionMetadata) {
  const basePath = metadata.workflowId
    ? `${WEBAPP_URL}/workflows/${metadata.workflowId}`
    : `${WEBAPP_URL}/workflows`;

  return NextResponse.redirect(basePath);
}

function handleError(error: unknown) {
  log.error("Error handling phone number subscription success:", safeStringify(error));

  const url = new URL(`${WEBAPP_URL}/workflows`);
  url.searchParams.set("error", "true");

  if (error instanceof HttpError) {
    url.searchParams.set("message", error.message);
  } else {
    url.searchParams.set("message", "An error occurred while processing your subscription");
  }

  return NextResponse.redirect(url.toString());
}

export default handler;
