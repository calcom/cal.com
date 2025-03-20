import { TestingModule } from "@nestjs/testing";
import { Prisma, App_RoutingForms_Form } from "@prisma/client";

import { PrismaReadService } from "../../../src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "../../../src/modules/prisma/prisma-write.service";

export class RoutingFormsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(routingFormId: App_RoutingForms_Form["id"]) {
    return this.prismaReadClient.app_RoutingForms_Form.findUnique({ where: { id: routingFormId } });
  }

  async create(data: Prisma.App_RoutingForms_FormCreateInput) {
    return this.prismaWriteClient.app_RoutingForms_Form.create({ data });
  }

  async delete(routingFormId: App_RoutingForms_Form["id"]) {
    return this.prismaWriteClient.app_RoutingForms_Form.delete({ where: { id: routingFormId } });
  }
}
