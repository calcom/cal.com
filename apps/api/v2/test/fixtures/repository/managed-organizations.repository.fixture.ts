import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class ManagedOrganizationsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getOrganizationWithManagedOrganizations(organizationId: number) {
    return this.prismaReadClient.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      include: {
        managedOrganization: true,
        managedOrganizations: true,
      },
    });
  }

  async getManagedOrganization(managerOrganizationId: number, managedOrganizationId: number) {
    return this.prismaReadClient.managedOrganization.findUnique({
      where: {
        managerOrganizationId_managedOrganizationId: {
          managerOrganizationId,
          managedOrganizationId,
        },
      },
    });
  }

  async createManagedOrganization(managerOrganizationId: number, managedOrganizationId: number) {
    return this.prismaWriteClient.managedOrganization.create({
      data: {
        managerOrganizationId,
        managedOrganizationId,
      },
    });
  }
}
