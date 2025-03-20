import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../prisma/prisma-read.service";

@Injectable()
export class RoutingFormsResponsesRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getRoutingFormResponses(routingFormId: string) {
    return this.dbRead.prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: routingFormId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
