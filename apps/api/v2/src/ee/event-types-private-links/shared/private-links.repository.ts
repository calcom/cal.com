import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrivateLinksRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async listByEventTypeId(eventTypeId: number) {
    return this.dbRead.prisma.hashedLink.findMany({
      where: { eventTypeId },
      select: { link: true, expiresAt: true, maxUsageCount: true, usageCount: true },
    });
  }

  async listByEventTypeIdIncludeEventTypeSlugAndOrg(eventTypeId: number) {
    return this.dbRead.prisma.hashedLink.findMany({
      where: { eventTypeId },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: {
          select: {
            slug: true,
            team: {
              select: {
                slug: true,
                isOrganization: true,
                parent: { select: { slug: true } },
              },
            },
            owner: {
              select: {
                profiles: {
                  select: {
                    username: true,
                    organization: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findWithEventTypeDetails(linkId: string) {
    return this.dbRead.prisma.hashedLink.findUnique({
      where: { link: linkId },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
      },
    });
  }

  async findByLinkIncludeEventTypeSlugAndOrg(linkId: string) {
    return this.dbRead.prisma.hashedLink.findUnique({
      where: { link: linkId },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: {
          select: {
            slug: true,
            team: {
              select: {
                slug: true,
                isOrganization: true,
                parent: { select: { slug: true } },
              },
            },
            owner: {
              select: {
                profiles: {
                  select: {
                    username: true,
                    organization: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(
    eventTypeId: number,
    link: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    return this.dbWrite.prisma.hashedLink.create({
      data: {
        eventTypeId,
        link: link.link,
        expiresAt: link.expiresAt,
        ...(typeof link.maxUsageCount === "number" ? { maxUsageCount: link.maxUsageCount } : {}),
      },
    });
  }

  async createIncludeEventTypeSlugAndOrg(
    eventTypeId: number,
    link: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    return this.dbWrite.prisma.hashedLink.create({
      data: {
        eventTypeId,
        link: link.link,
        expiresAt: link.expiresAt,
        ...(typeof link.maxUsageCount === "number" ? { maxUsageCount: link.maxUsageCount } : {}),
      },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: {
          select: {
            slug: true,
            team: {
              select: {
                slug: true,
                isOrganization: true,
                parent: { select: { slug: true } },
              },
            },
            owner: {
              select: {
                profiles: {
                  select: {
                    username: true,
                    organization: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(
    eventTypeId: number,
    link: { link: string; expiresAt?: Date | null; maxUsageCount?: number | null }
  ) {
    return this.dbWrite.prisma.hashedLink.updateMany({
      where: { eventTypeId, link: link.link },
      data: {
        ...(link.expiresAt !== undefined ? { expiresAt: link.expiresAt } : {}),
        ...(typeof link.maxUsageCount === "number" ? { maxUsageCount: link.maxUsageCount } : {}),
      },
    });
  }

  async delete(eventTypeId: number, linkId: string) {
    return this.dbWrite.prisma.hashedLink.deleteMany({ where: { eventTypeId, link: linkId } });
  }
}
