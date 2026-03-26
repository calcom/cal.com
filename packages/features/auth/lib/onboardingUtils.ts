import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";

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
  // Query user data needed for onboarding check using UserRepository
  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findById({ id: userId });

  if (!user) {
    return null;
  }

  // Use provided organizationId or query it via ProfileRepository
  let organizationId: number | null;
  if (options?.organizationId !== undefined) {
    organizationId = options.organizationId;
  } else {
    const profile = await ProfileRepository.findFirstForUserId({ userId });
    organizationId = profile?.organizationId ?? null;
  }

  // Check if user should be shown onboarding
  const shouldShowOnboarding =
    !user.completedOnboarding && !organizationId && dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT);

  if (!shouldShowOnboarding) {
    return null;
  }

  // Check email verification if needed
  const featuresRepository = new FeaturesRepository(prisma);

  if (options?.checkEmailVerification) {
    const emailVerificationEnabled =
      await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

    if (!user.emailVerified && user.identityProvider === "CAL" && emailVerificationEnabled) {
      // User needs email verification, redirect to verification page
      return "/auth/verify-email";
    }
  }

  // Determine which onboarding path to use
  const onboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  // Check for any team membership (pending or accepted) to handle users who signed up via invite token
  // When users sign up with an invite token, the membership is auto-accepted
  const hasTeamMembership = await MembershipRepository.hasAnyTeamMembershipByUserId({ userId });

  if (hasTeamMembership && onboardingV3Enabled) {
    return "/onboarding/personal/settings";
  }

  return onboardingV3Enabled ? "/onboarding/getting-started" : "/getting-started";
}
