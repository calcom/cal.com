import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRoutingFormsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getRoutingFormWithResponses(orgId: number, teamId: number, routingFormId: string) {
    return this.dbRead.prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: routingFormId,
        team: {
          id: teamId,
          parentId: orgId,
        },
      },
    });
  }
}
