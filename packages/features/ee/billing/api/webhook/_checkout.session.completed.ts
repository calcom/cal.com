import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { CHECKOUT_SESSION_TYPES } from "../../constants";
import type { SWHMap } from "./__handler";
import { metadataRouter } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed"] });

const routeByMetadataType = metadataRouter<SWHMap["checkout.session.completed"]["data"]>({
  [CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION]: () => import("./_checkout.session.completed.phone"),
  [CHECKOUT_SESSION_TYPES.TEAM_CREATION]: () => import("./_checkout.session.completed.team-creation"),
  [CHECKOUT_SESSION_TYPES.CREDIT_PURCHASE]: () => import("./_checkout.session.completed.credits"),
});

async function persistAdTrackingMetadata(session: SWHMap["checkout.session.completed"]["data"]["object"]) {
  if (!session.customer || !session.metadata) return;

  const trackingMetadata = {
    gclid: session.metadata?.gclid,
    campaignId: session.metadata?.campaignId,
    liFatId: session.metadata?.liFatId,
    linkedInCampaignId: session.metadata?.linkedInCampaignId,
  };

  const cleanedMetadata = Object.fromEntries(Object.entries(trackingMetadata).filter(([_, value]) => value));

  if (Object.keys(cleanedMetadata).length === 0) return;

  try {
    const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
    await stripe.customers.update(customerId, { metadata: cleanedMetadata });
  } catch (error) {
    log.error("Failed to update Stripe customer metadata with ad tracking data", { error });
  }
}

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  // Ad tracking runs on every checkout session before routing
  await persistAdTrackingMetadata(session);

  // Subscription checkouts (org/team purchases) are handled via invoice.paid webhook, not here
  if (session.mode === "subscription") {
    log.info("Subscription checkout session completed - handled via invoice.paid", {
      sessionId: session.id,
      organizationOnboardingId: session.metadata?.organizationOnboardingId,
      teamId: session.metadata?.teamId,
    });
    return { success: true, message: "Subscription checkout handled via invoice.paid" };
  }

  const result = (await routeByMetadataType(data)) as { success: boolean; message?: string };

  // TODO(@sean): Remove after 2026-03-12 -- handles credit purchases created before
  // the "type" metadata field was added to checkout sessions in buyCredits.handler.ts.
  // Those in-flight sessions lack metadata.type so the metadataRouter skips them.
  // The credits handler validates the price ID, so non-credit sessions won't match.
  if (!result.success && !session.metadata?.type && session.mode === "payment") {
    log.info("Falling back to legacy credit purchase handler (no metadata type)", {
      sessionId: session.id,
    });
    const { default: creditsHandler } = await import("./_checkout.session.completed.credits");
    return creditsHandler(data);
  }

  return result;
};

export default handler;
