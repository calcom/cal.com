import type { PrismaClient } from "@calcom/prisma";
import type { TeamBrandingContext, UserBrandingContext } from "@calcom/lib/branding/types";

export class BrandingRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getEventTypeBrandingContext(eventTypeId: number): Promise<TeamBrandingContext | null> {
    const result = await this.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        teamId: true,
        team: {
          select: {
            id: true,
            hideBranding: true,
            parentId: true,
            parent: { select: { hideBranding: true } },
          },
        },
      },
    });

    return result?.team ?? null;
  }

  async getUserBranding(userId: number): Promise<UserBrandingContext | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, hideBranding: true },
    });
  }

  async getUserOrganizationId(userId: number, orgIdHint?: number | null): Promise<number | null> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, organizationId: orgIdHint ?? undefined },
      select: { organizationId: true },
    });
    return profile?.organizationId ?? null;
  }
}

export default BrandingRepository;


