import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { OrganizationSettingsRepository } from "@calcom/features/organizations/repositories/OrganizationSettingsRepository";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

import { tenantPrefix } from "../../ee/sso/lib/saml";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({ prefix: ["samlAccountLinking"] });
const SAML_NOT_AUTHORITATIVE_ERROR_URL = "/auth/error?error=saml-idp-not-authoritative";

export function getTeamIdFromSamlTenant(tenant: string): number | null {
  if (!tenant.startsWith(tenantPrefix)) {
    return null;
  }
  const teamId = parseInt(tenant.replace(tenantPrefix, ""), 10);
  if (Number.isNaN(teamId)) {
    return null;
  }
  return teamId;
}

/**
 * Prevents account takeover via malicious SAML IdPs asserting arbitrary emails.
 * IdP is authoritative when domain matches org's verified domain or user is already a member.
 */
export class SamlAccountLinkingService {
  private membershipRepository: MembershipRepository;
  private orgSettingsRepository: OrganizationSettingsRepository;

  constructor(prismaClient: PrismaClient = prisma) {
    this.membershipRepository = new MembershipRepository(prismaClient);
    this.orgSettingsRepository = new OrganizationSettingsRepository(prismaClient);
  }

  async isSamlIdpAuthoritativeForEmail(
    samlOrgTeamId: number,
    email: string
  ): Promise<{ authoritative: boolean; reason: string }> {
    const emailDomain = email.split("@")[1]?.toLowerCase();

    if (!emailDomain) {
      return { authoritative: false, reason: "invalid_email" };
    }

    const verifiedDomains = await this.orgSettingsRepository.getVerifiedDomains(samlOrgTeamId);
    const domainMatches = verifiedDomains.some(
      (verified) => emailDomain === verified || emailDomain.endsWith(`.${verified}`)
    );
    if (domainMatches) {
      return { authoritative: true, reason: "domain_verified" };
    }

    const hasMembership = await this.membershipRepository.hasAcceptedMembershipByEmail({
      email,
      teamId: samlOrgTeamId,
    });

    if (hasMembership) {
      return { authoritative: true, reason: "existing_member" };
    }

    return { authoritative: false, reason: "domain_mismatch" };
  }
}

export type AccountConversionValidationResult = { allowed: true } | { allowed: false; errorUrl: string };

export async function validateSamlAccountConversion(
  samlTenant: string | undefined,
  email: string,
  conversionContext: string
): Promise<AccountConversionValidationResult> {
  if (!samlTenant) {
    // Deny by default - if tenant is missing, we cannot verify IdP authority
    log.error("SAML conversion blocked - missing tenant", {
      emailDomain: email.split("@")[1],
      conversionContext,
    });
    return { allowed: false, errorUrl: SAML_NOT_AUTHORITATIVE_ERROR_URL };
  }

  const samlOrgTeamId = getTeamIdFromSamlTenant(samlTenant);
  if (!samlOrgTeamId) {
    // For hosted Cal.com: tenant must be in "team-{id}" format for org SSO
    // For self-hosted: allow non-org tenants (admin controls the setup)
    if (HOSTED_CAL_FEATURES) {
      log.warn(`Blocking ${conversionContext} conversion - invalid tenant format for hosted`, {
        tenant: samlTenant,
        emailDomain: email.split("@")[1],
      });
      return { allowed: false, errorUrl: SAML_NOT_AUTHORITATIVE_ERROR_URL };
    }
    return { allowed: true };
  }

  const service = new SamlAccountLinkingService(prisma);
  const authority = await service.isSamlIdpAuthoritativeForEmail(samlOrgTeamId, email);

  if (!authority.authoritative) {
    log.warn(`Blocking ${conversionContext} conversion - IdP not authoritative`, {
      emailDomain: email.split("@")[1],
      samlOrgTeamId,
      reason: authority.reason,
    });
    return { allowed: false, errorUrl: SAML_NOT_AUTHORITATIVE_ERROR_URL };
  }
  return { allowed: true };
}
