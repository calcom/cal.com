import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

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
