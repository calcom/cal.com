import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsRoutingFormsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getOrganizationRoutingForms(
    orgId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      afterUpdatedAt?: Date;
      beforeUpdatedAt?: Date;
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
        team: {
          id: orgId,
        },
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

  async getTeamRoutingForms(
    orgId: number,
    teamId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      afterUpdatedAt?: Date;
      beforeUpdatedAt?: Date;
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
        team: {
          parent: {
            id: orgId,
          },
        },
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

  async getOrganizationRoutingFormResponses(
    orgId: number,
    routingFormId: string,
    skip: number,
    take: number,
    options?: {
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      routedToBookingUid?: string;
    }
  ) {
    const { sortCreatedAt, sortUpdatedAt, afterCreatedAt, beforeCreatedAt, routedToBookingUid } =
      options || {};

    return this.dbRead.prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: routingFormId,
        form: {
          team: {
            id: orgId,
          },
        },
        ...(afterCreatedAt && { createdAt: { gte: afterCreatedAt } }),
        ...(beforeCreatedAt && { createdAt: { lte: beforeCreatedAt } }),
        ...(routedToBookingUid && { routedToBookingUid }),
      },
      orderBy: [
        ...(sortCreatedAt ? [{ createdAt: sortCreatedAt }] : []),
        ...(sortUpdatedAt ? [{ updatedAt: sortUpdatedAt }] : []),
      ],
      skip,
      take,
    });
  }

  async updateRoutingFormResponse(
    orgId: number,
    routingFormId: string,
    responseId: number,
    data: {
      response?: Record<string, any>;
    }
  ) {
    return this.dbWrite.prisma.app_RoutingForms_FormResponse.update({
      where: {
        id: responseId,
        formId: routingFormId,
        form: {
          team: {
            id: orgId,
          },
        },
      },
      data: {
        ...data,
      },
    });
  }
}
