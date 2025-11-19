import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Prisma, App_RoutingForms_Form, App_RoutingForms_FormResponse } from "@calcom/prisma/client";

export class RoutingFormsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
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

  async deleteResponse(routingFormResponseId: App_RoutingForms_FormResponse["id"]) {
    return this.prismaWriteClient.app_RoutingForms_FormResponse.delete({
      where: { id: routingFormResponseId },
    });
  }
}
