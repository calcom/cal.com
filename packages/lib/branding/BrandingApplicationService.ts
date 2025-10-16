import type { PrismaClient } from "@calcom/prisma";
import { shouldHideBrandingForEvent } from "@calcom/lib/hideBranding";
import logger from "@calcom/lib/logger";
import { BrandingRepository } from "@calcom/lib/server/repository/branding/BrandingRepository";
import type { BrandingServiceParams } from "./types";

export class BrandingApplicationService {
  private readonly repo: BrandingRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new BrandingRepository(prisma);
  }

  async computeHideBranding(input: BrandingServiceParams): Promise<boolean> {
    try {
      const { eventTypeId } = input;

      const teamContext =
        typeof input.teamContext !== "undefined"
          ? input.teamContext
          : await this.repo.getEventTypeBrandingContext(eventTypeId);

      const owner =
        typeof input.owner !== "undefined"
          ? input.owner
          : input.ownerIdFallback
          ? await this.repo.getUserBranding(input.ownerIdFallback)
          : null;

      const organizationId =
        typeof input.organizationId !== "undefined"
          ? input.organizationId
          : input.ownerIdFallback
          ? await this.repo.getUserOrganizationId(input.ownerIdFallback)
          : null;

      return await shouldHideBrandingForEvent({
        eventTypeId,
        team: teamContext ?? null,
        owner: owner ?? null,
        organizationId: organizationId ?? null,
      });
    } catch (error) {
      logger.error("BrandingApplicationService: Failed to compute hideBranding", {
        error,
        eventTypeId: input.eventTypeId,
        teamContext: input.teamContext,
        owner: input.owner,
        organizationId: input.organizationId,
        ownerIdFallback: input.ownerIdFallback,
      });
      // Always return false on error to ensure critical flows never fail
      return false;
    }
  }
}

export default BrandingApplicationService;


