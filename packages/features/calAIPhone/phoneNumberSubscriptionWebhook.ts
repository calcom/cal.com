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

/**
 * Handle a successful Stripe phone-number subscription checkout and redirect the user to the app.
 *
 * Parses `session_id` from the request URL query, fetches and validates the Stripe Checkout Session
 * (including payment status, subscription presence, and required metadata), and returns a redirect
 * response to the appropriate workflows success page. On any failure, returns a redirect to the
 * workflows page with error details.
 *
 * @param request - Incoming NextRequest; must include a `session_id` query parameter.
 * @returns A NextResponse performing the redirect to the success or error page.
 */
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

/**
 * Retrieve a Stripe Checkout Session by ID, expanding the associated subscription.
 *
 * @param sessionId - The Stripe Checkout Session ID to fetch.
 * @returns The fetched Checkout Session with `subscription` expanded.
 * @throws HttpError with status 404 if the session is not found.
 */
async function getCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (!session) {
    throw new HttpError({ statusCode: 404, message: "Checkout session not found" });
  }
  return session;
}

/**
 * Validate a Stripe Checkout Session and extract its typed metadata for a phone-number subscription.
 *
 * Ensures the session has been paid, includes an associated subscription, and that `session.metadata`
 * conforms to the checkout session metadata schema. Returns the parsed metadata on success.
 *
 * @param session - The Stripe Checkout Session produced by the checkout flow; must include `metadata` set by the application and an expanded `subscription`.
 * @returns The validated and typed checkout session metadata (CheckoutSessionMetadata).
 * @throws HttpError with status 402 if payment is not completed.
 * @throws HttpError with status 400 if the subscription is missing or metadata validation fails.
 */
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

/**
 * Redirects the user to the post-checkout success page for the workflow (or workflows list).
 *
 * If `metadata.workflowId` is present the redirect target is `{WEBAPP_URL}/workflows/{workflowId}`, otherwise `{WEBAPP_URL}/workflows`.
 *
 * @param metadata - Checkout session metadata; `workflowId` controls whether the redirect targets a specific workflow page or the workflows list.
 * @returns A NextResponse performing the redirect to the constructed success URL.
 */
function redirectToSuccess(metadata: CheckoutSessionMetadata) {
  const basePath = metadata.workflowId
    ? `${WEBAPP_URL}/workflows/${metadata.workflowId}`
    : `${WEBAPP_URL}/workflows`;

  return NextResponse.redirect(basePath);
}

/**
 * Log an error and return a redirect response to the workflows page with error details.
 *
 * Logs the provided error, constructs a redirect URL to `${WEBAPP_URL}/workflows` with
 * `error=true`, and includes a human-readable `message` query parameter. If `error` is an
 * HttpError its message is forwarded; otherwise a generic message is used.
 *
 * @param error - The error to log and encode into the redirect query string.
 * @returns A NextResponse that redirects the client to the workflows page with error information.
 */
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
