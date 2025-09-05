import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class OrganizationsRoutingFormsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getOrganizationRoutingForms(
    orgId: number,
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
      teamIds?: number[];
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
      teamIds,
    } = options || {};

    return this.dbRead.prisma.app_RoutingForms_Form.findMany({
      where: {
        team: { parentId: orgId, ...(teamIds?.length ? { id: { in: teamIds } } : {}) },
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
      afterCreatedAt?: string;
      beforeCreatedAt?: string;
      afterUpdatedAt?: string;
      beforeUpdatedAt?: string;
      routedToBookingUid?: string;
    }
  ) {
    const {
      sortCreatedAt,
      sortUpdatedAt,
      afterCreatedAt,
      beforeCreatedAt,
      routedToBookingUid,
      afterUpdatedAt,
      beforeUpdatedAt,
    } = options || {};
    await this.dbRead.prisma.app_RoutingForms_Form.findFirstOrThrow({
      where: {
        team: { parentId: orgId },
        id: routingFormId,
      },
    });

    return this.dbRead.prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: routingFormId,
        ...(afterCreatedAt && { createdAt: { gte: afterCreatedAt } }),
        ...(beforeCreatedAt && { createdAt: { lte: beforeCreatedAt } }),
        ...(afterUpdatedAt && { updatedAt: { gte: afterUpdatedAt } }),
        ...(beforeUpdatedAt && { updatedAt: { lte: beforeUpdatedAt } }),
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
            parentId: orgId,
          },
        },
      },
      data: {
        ...data,
      },
    });
  }
}
