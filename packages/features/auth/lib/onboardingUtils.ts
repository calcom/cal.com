import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

const ONBOARDING_INTRODUCED_AT = dayjs("September 1 2021").toISOString();

/**
 * Checks if a user needs onboarding on the server side.
 * Returns the onboarding path if redirect is needed, null otherwise.
 *
 * @param userId - The user ID to check
 * @param options - Optional configuration
 * @param options.checkEmailVerification - Whether to check if email verification is required
 * @param options.organizationId - Optional organizationId from session (to avoid extra query)
 */
export async function checkOnboardingRedirect(
  userId: number,
  options?: {
    checkEmailVerification?: boolean;
    organizationId?: number | null;
  }
): Promise<string | null> {
  // Query minimal user data needed for onboarding check
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      completedOnboarding: true,
      createdDate: true,
      emailVerified: true,
      identityProvider: true,
    },
  });

  if (!user) {
    return null;
  }

  // Use provided organizationId or query it
  let organizationId: number | null;
  if (options?.organizationId !== undefined) {
    organizationId = options.organizationId;
  } else {
    // Check if user has any profile with an organization
    const profile = await prisma.profile.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    organizationId = profile?.organizationId ?? null;
  }

  // Check if user should be shown onboarding
  const shouldShowOnboarding =
    !user.completedOnboarding && !organizationId && dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT);

  if (!shouldShowOnboarding) {
    return null;
  }

  // Check email verification if needed
  if (options?.checkEmailVerification) {
    const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
    const featuresRepository = new FeaturesRepository(prisma);
    const emailVerificationEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
      "email-verification"
    );

    if (!user.emailVerified && user.identityProvider === "CAL" && emailVerificationEnabled) {
      // User needs email verification, don't redirect to onboarding yet
      return null;
    }
  }

  // Determine which onboarding path to use
  const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
  const featuresRepository = new FeaturesRepository(prisma);
  const onboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  return onboardingV3Enabled ? "/onboarding/getting-started" : "/getting-started";
}
