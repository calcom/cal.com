import { GoogleAdsApi, services } from "google-ads-api";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";
import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { CHECKOUT_SESSION_TYPES } from "../../constants";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed"] });

/**
 * Send conversion to Google Ads via Click Conversions API
 * @see https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */
async function sendGoogleAdsConversion(session: SWHMap["checkout.session.completed"]["data"]["object"]) {
  const gclid = session.metadata?.gclid;

  if (!gclid) {
    log.debug("No gclid in session metadata, skipping Google Ads conversion tracking");
    return;
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!customerId || !conversionActionId || !clientId || !clientSecret || !developerToken || !refreshToken) {
    log.warn("Google Ads conversion tracking not fully configured, skipping", {
      hasCustomerId: !!customerId,
      hasConversionActionId: !!conversionActionId,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasDeveloperToken: !!developerToken,
      hasRefreshToken: !!refreshToken,
    });
    return;
  }

  try {
    // Calculate conversion value from Stripe session (Stripe uses cents)
    const conversionValue = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency?.toUpperCase() || "USD";

    // Format datetime as required by Google Ads API: "yyyy-mm-dd HH:mm:ss+|-HH:mm"
    // Google requires timezone-aware format, not ISO
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Get timezone offset in format +HH:mm or -HH:mm
    const timezoneOffset = -now.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, "0");
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, "0");
    const offsetSign = timezoneOffset >= 0 ? "+" : "-";

    const conversionDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;

    log.info("Sending Google Ads conversion", {
      gclid,
      value: conversionValue,
      currency,
      orderId: session.id,
      conversionDateTime,
    });

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken,
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
      // login_customer_id: "7107634172",
    });

    const conversionAction = `customers/${customerId}/conversionActions/${conversionActionId}`;

    const request = new services.UploadClickConversionsRequest({
      customer_id: customerId,
      partial_failure: true,
      validate_only: true,
      conversions: [
        {
          gclid: gclid ?? "abcdtesting",
          order_id: session.id,
          conversion_action: conversionAction,
          conversion_date_time: conversionDateTime,
          conversion_value: 20,
          currency_code: currency,
        },
      ],
    });

    const response = await customer.conversionUploads.uploadClickConversions(request);

    if (response.partial_failure_error) {
      log.error("Partial failure uploading Google Ads conversion", {
        error: response.partial_failure_error,
        gclid,
        sessionId: session.id,
      });
      return;
    }

    log.info("Google Ads conversion uploaded successfully", {
      gclid,
      value: conversionValue,
      response: response,
    });
  } catch (error) {
    log.error("Error sending Google Ads conversion", {
      error,
      gclid,
      sessionId: session.id,
    });
  }
}

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  sendGoogleAdsConversion(session).catch((error) => {
    log.error("Google Ads conversion tracking failed", error);
  });

  // Store gclid in subscription metadata for future conversion tracking on recurring payments
  if (session.subscription && session.metadata?.gclid) {
    try {
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;

      await stripe.subscriptions.update(subscriptionId, {
        metadata: {
          gclid: session.metadata.gclid,
        },
      });
    } catch (error) {
      log.error("Failed to store gclid in subscription metadata", {
        error,
        subscriptionId: session.subscription,
      });
    }
  }

  if (session.metadata?.type === CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION) {
    return await handleCalAIPhoneNumberSubscription(session);
  }

  // Handle credit purchases (existing logic)
  if (!session.amount_total) {
    throw new HttpCode(400, "Missing required payment details");
  }

  const teamId = session.metadata?.teamId ? Number(session.metadata.teamId) : undefined;
  const userId = session.metadata?.userId ? Number(session.metadata.userId) : undefined;

  if (!teamId && !userId) {
    throw new HttpCode(400, "Team id and user id are missing, but at least one is required");
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;
  const nrOfCredits = lineItems.data[0]?.quantity ?? 0;

  if (!priceId || priceId !== process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID || !nrOfCredits) {
    throw new HttpCode(400, "Invalid price ID");
  }

  await saveToCreditBalance({ userId, teamId, nrOfCredits });

  return { success: true };
};

async function saveToCreditBalance({
  userId,
  teamId,
  nrOfCredits,
}: {
  userId?: number;
  teamId?: number;
  nrOfCredits: number;
}) {
  const creditBalance = await CreditsRepository.findCreditBalance({ teamId, userId });

  let creditBalanceId = creditBalance?.id;

  if (creditBalance) {
    await CreditsRepository.updateCreditBalance({
      id: creditBalance.id,
      data: { additionalCredits: { increment: nrOfCredits }, limitReachedAt: null, warningSentAt: null },
    });
  } else {
    const newCreditBalance = await CreditsRepository.createCreditBalance({
      teamId: teamId,
      userId: !teamId ? userId : undefined,
      additionalCredits: nrOfCredits,
    });
    creditBalanceId = newCreditBalance.id;
  }

  if (creditBalanceId) {
    await CreditsRepository.createCreditPurchaseLog({
      credits: nrOfCredits,
      creditBalanceId,
    });
  }
}

async function handleCalAIPhoneNumberSubscription(
  session: SWHMap["checkout.session.completed"]["data"]["object"]
) {
  const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
  const teamId = session.metadata?.teamId ? parseInt(session.metadata.teamId, 10) : null;
  const agentId = session.metadata?.agentId || null;

  if (!userId || !session.subscription) {
    console.error("Missing required data for phone number subscription", {
      userId,
      hasSubscription: !!session.subscription,
    });
    throw new HttpCode(400, "Missing required data for phone number subscription");
  }

  if (!agentId || agentId?.trim() === "") {
    console.error("Missing agentId for phone number subscription", {
      userId,
      teamId,
    });
    throw new HttpCode(400, "Missing agentId for phone number subscription");
  }

  const agentRepo = new PrismaAgentRepository(prisma);
  const agent = await agentRepo.findByIdWithUserAccess({
    agentId,
    userId,
    teamId: teamId ?? undefined,
  });

  if (!agent) {
    console.error("Agent not found or user does not have access", { agentId, userId });
    throw new HttpCode(404, "Agent not found or user does not have access to it");
  }

  const aiService = createDefaultAIPhoneServiceProvider();

  const calAIPhoneNumber = await aiService.createPhoneNumber({
    nickname: `userId:${userId}${teamId ? `-teamId:${teamId}` : ""}-${Date.now()}`,
  });

  if (!calAIPhoneNumber?.phone_number) {
    console.error("Failed to create phone number - invalid response from Retell");
    throw new HttpCode(500, "Failed to create phone number - invalid response");
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error("Invalid subscription data", { subscription: session.subscription });
    throw new HttpCode(400, "Invalid subscription data");
  }

  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const newNumber = await phoneNumberRepo.createPhoneNumber({
    userId,
    teamId: teamId ?? undefined,
    phoneNumber: calAIPhoneNumber.phone_number,
    provider: calAIPhoneNumber.provider,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
    providerPhoneNumberId: calAIPhoneNumber.phone_number,
  });

  try {
    console.log("Attempting to link agent to phone number:", { agentId, phoneNumberId: newNumber.id });

    const agent = await agentRepo.findByIdWithUserAccess({
      agentId,
      userId,
    });

    if (!agent) {
      console.error("Agent not found or user does not have access", { agentId, userId });
      throw new HttpCode(404, "Agent not found or user does not have access to it");
    }

    console.log("Found agent:", { agentId: agent.id, providerAgentId: agent.providerAgentId });

    // Assign agent to the new number via Retell API
    await aiService.updatePhoneNumber(calAIPhoneNumber.phone_number, {
      outbound_agent_id: agent.providerAgentId,
    });

    // Link the new number to the agent in our database
    await prisma.calAiPhoneNumber.update({
      where: { id: newNumber.id },
      data: {
        outboundAgent: {
          connect: { id: agentId },
        },
      },
    });

    console.log("Phone number successfully linked to agent");
  } catch (error) {
    console.error("Agent linking error details:", {
      error,
      agentId,
      phoneNumber: calAIPhoneNumber.phone_number,
      userId,
    });
  }

  return { success: true, phoneNumber: newNumber.phoneNumber };
}

export default handler;
