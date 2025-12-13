import { PolicyRepository } from "@calcom/features/policies/lib/repository/policy.repository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { PolicyType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["PolicyService"] });

/**
 * Service layer for policy-related business logic.
 * Orchestrates repository calls and implements business rules.
 */
export class PolicyService {
  private readonly policyRepository: PolicyRepository;

  constructor(policyRepository?: PolicyRepository) {
    this.policyRepository = policyRepository ?? new PolicyRepository(prisma);
  }

  /**
   * Gets the unaccepted policy for a user (if they need to accept one).
   * Returns null if user has accepted the latest policy or if no policy exists.
   * @param userId - The user ID
   * @param type - The policy type
   * @returns Promise with unaccepted policy data or null
   */
  async getUnacceptedPolicyForUser(userId: number, type: PolicyType) {
    // Get latest policy (uses cache)
    const latestPolicy = await this.policyRepository.getLatestPolicy(type);

    if (!latestPolicy) {
      return null;
    }

    // Check if user has accepted it
    const hasAccepted = await this.policyRepository.hasUserAcceptedPolicy(
      userId,
      latestPolicy.version,
      type
    );

    if (hasAccepted) {
      return null;
    }

    return latestPolicy;
  }

  /**
   * Gets the first unaccepted policy for a user across all policy types.
   * @param userId - The user ID
   * @returns Promise with unaccepted policy data or null if all policies are accepted
   */
  async getAnyUnacceptedPolicyForUser(userId: number) {
    // Define priority order for policy types
    // If a user needs to accept multiple policies, we show them in this order
    const policyTypePriority = [
      PolicyType.PRIVACY_POLICY,
    ];

    // Check all policy types in parallel
    const results = await Promise.all(
      policyTypePriority.map(async (policyType) => {
        const unacceptedPolicy = await this.getUnacceptedPolicyForUser(userId, policyType);
        return { policyType, unacceptedPolicy };
      })
    );

    // Return the first unaccepted policy (respecting priority order)
    for (const result of results) {
      if (result.unacceptedPolicy) {
        return result.unacceptedPolicy;
      }
    }

    return null;
  }

  /**
   * Records a user's acceptance of a policy version.
   * @param userId - The user ID
   * @param policyVersion - The policy version date
   * @param policyType - The policy type
   * @returns Object with success status and acceptance timestamp
   */
  async acceptPolicy(userId: number, policyVersion: Date, policyType: PolicyType) {
    const hasAccepted = await this.policyRepository.hasUserAcceptedPolicy(
      userId,
      policyVersion,
      policyType
    );

    if (hasAccepted) {
      const existingAcceptance = await prisma.userPolicyAcceptance.findUnique({
        where: {
          userId_policyVersion_policyType: {
            userId,
            policyVersion,
            policyType,
          },
        },
      });

      return {
        success: true,
        acceptedAt: existingAcceptance!.acceptedAt,
        alreadyAccepted: true,
      };
    }

    const acceptance = await this.policyRepository.recordAcceptance(userId, policyVersion, policyType);

    return {
      success: true,
      acceptedAt: acceptance.acceptedAt,
      alreadyAccepted: false,
    };
  }

  /**
   * Records the user's acceptance of the latest privacy policy during signup.
   * This is called after user creation to ensure that users who accept the
   * policy checkbox during signup don't see the modal again on first login.
   * Does not throw errors - logs them instead to avoid failing the signup process.
   *
   * @param userId - The ID of the newly created user
   * @returns Promise that resolves when acceptance is recorded (or on error)
   */
  async recordLatestPolicyAcceptanceOnSignup(userId: number): Promise<void> {
    try {
      // Get the latest privacy policy
      const latestPolicy = await this.policyRepository.getLatestPolicy(PolicyType.PRIVACY_POLICY);

      // If no policy exists yet, nothing to record
      if (!latestPolicy) {
        log.info("No privacy policy found, skipping acceptance record", { userId });
        return;
      }

      // Record the user's acceptance
      await this.policyRepository.recordAcceptance(userId, latestPolicy.version, PolicyType.PRIVACY_POLICY);

      log.info("Recorded policy acceptance for new user", {
        userId,
        policyVersion: latestPolicy.version,
        policyType: PolicyType.PRIVACY_POLICY,
      });
    } catch (error) {
      // Log the error but don't throw - we don't want to fail the entire signup
      // if policy acceptance recording fails. The user will just see the modal on first login.
      log.error("Failed to record policy acceptance on signup", { userId, error });
    }
  }
}
