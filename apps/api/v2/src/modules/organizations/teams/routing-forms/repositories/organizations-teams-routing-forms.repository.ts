import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRoutingFormsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getTeamRoutingForms(
    teamId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: string;
      beforeCreatedAt?: string;
      afterUpdatedAt?: string;
      beforeUpdatedAt?: string;
    }
  ) {
    const {
      disabled,
      name,
      sortCreatedAt,
      sortUpdatedAt,
      afterCreatedAt,
      beforeCreatedAt,
      afterUpdatedAt,
      beforeUpdatedAt,
    } = options || {};

    return this.dbRead.prisma.app_RoutingForms_Form.findMany({
      where: {
        teamId,
        ...(disabled !== undefined && { disabled }),
        ...(name && { name: { contains: name, mode: "insensitive" } }),
        ...(afterCreatedAt && { createdAt: { gte: afterCreatedAt } }),
        ...(beforeCreatedAt && { createdAt: { lte: beforeCreatedAt } }),
        ...(afterUpdatedAt && { updatedAt: { gte: afterUpdatedAt } }),
        ...(beforeUpdatedAt && { updatedAt: { lte: beforeUpdatedAt } }),
      },
      orderBy: [
        ...(sortCreatedAt ? [{ createdAt: sortCreatedAt }] : []),
        ...(sortUpdatedAt ? [{ updatedAt: sortUpdatedAt }] : []),
      ],
      skip,
      take,
    });
  }
}
