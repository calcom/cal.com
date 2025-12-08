import { PolicyService } from "@calcom/features/policies/lib/service/policy.service";
import type { PrismaClient } from "@calcom/prisma";

/**
 * Records the user's acceptance of the latest privacy policy during signup.
 * This is called after user creation to ensure that users who accept the
 * policy checkbox during signup don't see the modal again on first login.
 *
 * @param userId - The ID of the newly created user
 * @param prisma - Prisma client instance
 */
export async function recordPolicyAcceptanceOnSignup(userId: number, prisma: PrismaClient) {
  const policyService = new PolicyService(prisma);
  await policyService.recordLatestPolicyAcceptanceOnSignup(userId);
}
