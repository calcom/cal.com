import { createDomainManager } from "@calcom/domains/create-domain-manager";
import type { DomainManager } from "@calcom/domains/domain-manager";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";

import { DOMAIN_ALREADY_IN_USE_ERROR, DOMAIN_REGEX, DomainVerificationStatus, DomainVerificationResult } from "../constants";
import type { CustomDomainRepository } from "../repositories/custom-domain-repository";

export { DOMAIN_ALREADY_IN_USE_ERROR, DOMAIN_REGEX, DomainVerificationStatus } from "../constants";

const log = logger.getSubLogger({ prefix: ["CustomDomainService"] });

export interface ICustomDomainServiceDeps {
  customDomainRepository: CustomDomainRepository;
}

export class CustomDomainService {
  private readonly domainManager: DomainManager;

  constructor(private readonly deps: ICustomDomainServiceDeps) {
    this.domainManager = createDomainManager({
      provider: "vercel",
      projectId: process.env.PROJECT_ID_VERCEL ?? "",
      teamId: process.env.TEAM_ID_VERCEL,
      authToken: process.env.AUTH_BEARER_TOKEN_VERCEL ?? "",
    });
  }

  async addDomain(input: { teamId: number; slug: string }) {
    const normalizedSlug = input.slug.toLowerCase().trim();

    if (!DOMAIN_REGEX.test(normalizedSlug)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid domain format");
    }

    const existingTeamDomain = await this.deps.customDomainRepository.findByTeamId(input.teamId);
    if (existingTeamDomain) {
      throw ErrorWithCode.Factory.BadRequest("Team already has a custom domain configured");
    }

    const existingDomain = await this.deps.customDomainRepository.existsBySlug(normalizedSlug);
    if (existingDomain) {
      throw ErrorWithCode.Factory.BadRequest(DOMAIN_ALREADY_IN_USE_ERROR);
    }

    const result = await this.domainManager.register(normalizedSlug);
    if (!result.success) {
      throw ErrorWithCode.Factory.InternalServerError("Failed to register domain with provider");
    }

    const domain = await this.withProviderRollback(normalizedSlug, () =>
      this.deps.customDomainRepository.create({
        teamId: input.teamId,
        slug: normalizedSlug,
      })
    );

    return domain;
  }

  async removeDomain(input: { teamId: number }) {
    const domain = await this.deps.customDomainRepository.findByTeamId(input.teamId);
    if (!domain) {
      throw ErrorWithCode.Factory.NotFound("No custom domain found for this team");
    }

    await this.domainManager.unregister(domain.slug);

    await this.deps.customDomainRepository.delete(domain.id);

    return { success: true };
  }

  async replaceDomain(input: { teamId: number; newSlug: string }) {
    const normalizedSlug = input.newSlug.toLowerCase().trim();

    if (!DOMAIN_REGEX.test(normalizedSlug)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid domain format");
    }

    const existingDomain = await this.deps.customDomainRepository.findByTeamId(input.teamId);
    if (!existingDomain) {
      throw ErrorWithCode.Factory.NotFound("No custom domain found for this team");
    }

    if (existingDomain.slug === normalizedSlug) {
      return existingDomain;
    }

    const slugTaken = await this.deps.customDomainRepository.existsBySlug(normalizedSlug);
    if (slugTaken) {
      throw ErrorWithCode.Factory.BadRequest(DOMAIN_ALREADY_IN_USE_ERROR);
    }

    const result = await this.domainManager.register(normalizedSlug);
    if (!result.success) {
      throw ErrorWithCode.Factory.InternalServerError("Failed to register domain with provider");
    }

    const updatedDomain = await this.withProviderRollback(normalizedSlug, () =>
      this.deps.customDomainRepository.updateSlug(existingDomain.id, normalizedSlug)
    );

    try {
      await this.domainManager.unregister(existingDomain.slug);
    } catch (error) {
      log.error(`Failed to delete old domain from provider: ${existingDomain.slug}`, error);
    }

    return updatedDomain;
  }

  async checkAvailability(slug: string): Promise<{ available: boolean }> {
    const normalizedSlug = slug.toLowerCase().trim();
    if (!DOMAIN_REGEX.test(normalizedSlug)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid domain format");
    }
    const exists = await this.deps.customDomainRepository.existsBySlug(normalizedSlug);
    return { available: !exists };
  }

  async getDomain(teamId: number) {
    return this.deps.customDomainRepository.findByTeamId(teamId);
  }

  async verifyDomainStatus(teamId: number): Promise<DomainVerificationResult> {
    const domain = await this.deps.customDomainRepository.findByTeamId(teamId);
    if (!domain) {
      return { status: DomainVerificationStatus.NOT_FOUND };
    }

    const info = await this.domainManager.getDomainInfo(domain.slug);
    if (!info) {
      if (domain.verified) {
        await this.deps.customDomainRepository.updateVerificationStatus(domain.id, false);
      }
      return { status: DomainVerificationStatus.NOT_FOUND };
    }

    const config = await this.domainManager.getConfigStatus(domain.slug);
    if (!config.configured) {
      if (domain.verified) {
        await this.deps.customDomainRepository.updateVerificationStatus(domain.id, false);
      }
      return { status: DomainVerificationStatus.INVALID_CONFIGURATION };
    }
    if (config.conflicts?.length) {
      if (domain.verified) {
        await this.deps.customDomainRepository.updateVerificationStatus(domain.id, false);
      }
      return { status: DomainVerificationStatus.CONFLICTING_DNS };
    }

    if (!info.verified) {
      const result = await this.domainManager.triggerVerification(domain.slug);
      if (domain.verified !== result.verified) {
        await this.deps.customDomainRepository.updateVerificationStatus(domain.id, result.verified);
      }
      return {
        status: result.verified ? DomainVerificationStatus.VALID : DomainVerificationStatus.PENDING,
      };
    }

    if (!domain.verified) {
      await this.deps.customDomainRepository.updateVerificationStatus(domain.id, true);
    }
    return { status: DomainVerificationStatus.VALID };
  }

  private async withProviderRollback<T>(slug: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      try {
        await this.domainManager.unregister(slug);
      } catch (cleanupError) {
        log.error(`Failed to clean up domain after error: ${slug}`, cleanupError);
      }
      throw error;
    }
  }
}
