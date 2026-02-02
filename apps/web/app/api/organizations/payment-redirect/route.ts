import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { orgOnboardingTeamsSchema } from "@calcom/prisma/zod-utils";

const querySchema = z.object({
  session_id: z.string().min(1),
  paymentStatus: z.enum(["success", "failed"]),
});

async function getHandler(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { session_id, paymentStatus } = querySchema.parse({
      session_id: searchParams.get("session_id"),
      paymentStatus: searchParams.get("paymentStatus"),
    });

    // Retrieve checkout session from Stripe to get metadata
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    if (!checkoutSession) {
      throw new HttpError({ statusCode: 404, message: "Checkout session not found" });
    }

    // Extract organizationOnboardingId from metadata
    const organizationOnboardingId = checkoutSession.metadata?.organizationOnboardingId;

    // Check if onboarding-v3 feature flag is enabled
    const featuresRepository = new FeaturesRepository(prisma);
    const isOnboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

    // Build query params to preserve
    const params = new URLSearchParams({
      session_id,
      paymentStatus,
    });

    // If onboarding-v3 is enabled AND organizationOnboardingId exists, redirect to onboarding flow
    if (isOnboardingV3Enabled && organizationOnboardingId) {
      // Check if this is a migration flow (user has already completed onboarding)
      const onboarding = await OrganizationOnboardingRepository.findById(organizationOnboardingId);
      const hasMigratedTeams =
        onboarding?.teams &&
        orgOnboardingTeamsSchema.parse(onboarding.teams).some((team) => team.isBeingMigrated);

      if (hasMigratedTeams) {
        // Migration flow - user already completed onboarding, redirect to event-types
        const redirectUrl = new URL("/event-types?newOrganizationModal=true", WEBAPP_URL).toString();
        return NextResponse.redirect(redirectUrl);
      }

      // Regular flow - redirect to personal onboarding
      params.append("fromTeamOnboarding", "true");
      const redirectUrl = new URL(
        `/onboarding/personal/settings?${params.toString()}`,
        WEBAPP_URL
      ).toString();
      return NextResponse.redirect(redirectUrl);
    }

    // Otherwise, redirect to the current flow
    // Preserve any additional query params that were passed
    searchParams.forEach((value, key) => {
      if (key !== "session_id" && key !== "paymentStatus") {
        params.append(key, value);
      }
    });

    const redirectUrl = new URL(
      `/settings/organizations/new/status?${params.toString()}`,
      WEBAPP_URL
    ).toString();
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    // If there's an error, fall back to the default status page
    const searchParams = req.nextUrl.searchParams;
    const fallbackParams = new URLSearchParams({
      session_id: searchParams.get("session_id") || "",
      paymentStatus: searchParams.get("paymentStatus") || "failed",
    });
    const fallbackUrl = new URL(
      `/settings/organizations/new/status?${fallbackParams.toString()}`,
      WEBAPP_URL
    ).toString();
    return NextResponse.redirect(fallbackUrl);
  }
}

export const GET = defaultResponderForAppDir(getHandler);
