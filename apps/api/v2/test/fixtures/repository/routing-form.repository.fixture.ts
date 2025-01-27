import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { App_RoutingForms_Form } from "@prisma/client";

import { Prisma } from "@calcom/prisma/client";

export class RoutingFormRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(routingForm: Prisma.App_RoutingForms_FormCreateArgs["data"]) {
    return this.prismaWriteClient.app_RoutingForms_Form.create({ data: routingForm });
  }

  async getById(routingFormId: App_RoutingForms_Form["id"]) {
    return this.prismaReadClient.app_RoutingForms_Form.findFirst({ where: { id: routingFormId } });
  }

  async deleteById(routingFormId: App_RoutingForms_Form["id"]) {
    return this.prismaWriteClient.app_RoutingForms_Form.delete({ where: { id: routingFormId } });
  }

  async getByUserId(userId: App_RoutingForms_Form["userId"]) {
    return this.prismaReadClient.app_RoutingForms_Form.findMany({ where: { userId } });
  }

  async getByTeamId(teamId: App_RoutingForms_Form["teamId"]) {
    return this.prismaReadClient.app_RoutingForms_Form.findMany({ where: { teamId } });
  }
}
