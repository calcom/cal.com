import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRoutingFormsResponsesRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getTeamRoutingFormResponses(
    teamId: number,
    routingFormId: string,
    skip: number,
    take: number,
    options?: {
      sortCreatedAt?: "asc" | "desc";
      afterCreatedAt?: string;
      beforeCreatedAt?: string;
      routedToBookingUid?: string;
    }
  ) {
    const { sortCreatedAt, afterCreatedAt, beforeCreatedAt, routedToBookingUid } = options || {};

    return this.dbRead.prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: routingFormId,
        form: {
          teamId,
        },
        ...(afterCreatedAt && { createdAt: { gte: afterCreatedAt } }),
        ...(beforeCreatedAt && { createdAt: { lte: beforeCreatedAt } }),
        ...(routedToBookingUid && { routedToBookingUid }),
      },
      orderBy: [...(sortCreatedAt ? [{ createdAt: sortCreatedAt }] : [])],
      skip,
      take,
    });
  }

  async updateTeamRoutingFormResponse(
    teamId: number,
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
          teamId,
        },
      },
      data: {
        ...data,
      },
    });
  }
}
