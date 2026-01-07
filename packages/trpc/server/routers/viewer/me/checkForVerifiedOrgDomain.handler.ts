import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export type VerifiedOrgDomainBannerData = {
  orgId: number;
  orgName: string;
  domain: string;
} | null;

export const checkForVerifiedOrgDomainHandler = async ({
  ctx,
}: Props): Promise<VerifiedOrgDomainBannerData> => {
  const { user } = ctx;

  // Only show banner for users not already in an organization
  if (user.organizationId) {
    return null;
  }

  // Extract domain from user's email
  const emailDomain = user.email.split("@").at(-1);
  if (!emailDomain) {
    return null;
  }

  // Check if there's a verified organization with this domain
  const organizationRepository = getOrganizationRepository();
  const org = await organizationRepository.findVerifiedNonPlatformOrgByAutoAcceptEmailDomainIncludeName(
    emailDomain
  );

  if (!org || !org.organizationSettings?.orgAutoAcceptEmail) {
    return null;
  }

  return {
    orgId: org.id,
    orgName: org.name,
    domain: org.organizationSettings.orgAutoAcceptEmail,
  };
};
