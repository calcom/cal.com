import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RoutingFormsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getTeamRoutingForm(teamId: number, routingFormId: string) {
    return this.dbRead.prisma.app_RoutingForms_Form.findFirst({
      where: {
        id: routingFormId,
        teamId,
      },
    });
  }
}
