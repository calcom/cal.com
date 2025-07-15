import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { TestingModule } from "@nestjs/testing";

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
}
