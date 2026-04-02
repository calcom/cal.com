import { Prisma } from "@calcom/prisma/client";
import type { CustomDomain } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import { ErrorWithCode } from "@calcom/lib/errors";

type CustomDomainWithTeam = CustomDomain & {
  team: {
    id: number;
    slug: string | null;
    name: string;
    isOrganization: boolean;
    parentId: number | null;
  };
};

const customDomainSelect = {
  id: true,
  teamId: true,
  slug: true,
  verified: true,
  lastCheckedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const customDomainWithTeamSelect = {
  ...customDomainSelect,
  team: {
    select: {
      id: true,
      slug: true,
      name: true,
      isOrganization: true,
      parentId: true,
    },
  },
} as const;

export class CustomDomainRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.customDomain.findUnique({
      where: { id },
      select: customDomainSelect,
    });
  }

  async findBySlug(slug: string) {
    return this.prismaClient.customDomain.findUnique({
      where: { slug: slug.toLowerCase() },
      select: customDomainSelect,
    });
  }

  async findBySlugWithTeam(slug: string): Promise<CustomDomainWithTeam | null> {
    return this.prismaClient.customDomain.findUnique({
      where: { slug: slug.toLowerCase() },
      select: customDomainWithTeamSelect,
    });
  }

  async findByTeamId(teamId: number) {
    return this.prismaClient.customDomain.findUnique({
      where: { teamId },
      select: customDomainSelect,
    });
  }

  async create(data: { teamId: number; slug: string }) {
    try {
      return await this.prismaClient.customDomain.create({
        data: {
          teamId: data.teamId,
          slug: data.slug.toLowerCase(),
          verified: false,
        },
        select: customDomainSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ErrorWithCode.Factory.BadRequest("Domain is already in use");
      }
      throw error;
    }
  }

  async updateVerificationStatus(id: string, verified: boolean) {
    return this.prismaClient.customDomain.update({
      where: { id },
      data: {
        verified,
        lastCheckedAt: new Date(),
      },
      select: customDomainSelect,
    });
  }

  async updateSlug(id: string, slug: string) {
    try {
      return await this.prismaClient.customDomain.update({
        where: { id },
        data: {
          slug: slug.toLowerCase(),
          verified: false,
          lastCheckedAt: new Date(),
        },
        select: customDomainSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ErrorWithCode.Factory.BadRequest("Domain is already in use");
      }
      throw error;
    }
  }

  async delete(id: string) {
    return this.prismaClient.customDomain.delete({
      where: { id },
      select: customDomainSelect,
    });
  }

  async deleteByTeamId(teamId: number) {
    return this.prismaClient.customDomain.delete({
      where: { teamId },
      select: customDomainSelect,
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const domain = await this.prismaClient.customDomain.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });
    return domain !== null;
  }

  async getUnverifiedDomainsForCheck(limit: number = 30) {
    return this.prismaClient.customDomain.findMany({
      where: { verified: false },
      orderBy: { lastCheckedAt: "asc" },
      take: limit,
      select: customDomainWithTeamSelect,
    });
  }
}
