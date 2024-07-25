import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

export class PlatformBillingRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(orgId: number) {
    const randomString = Date.now().toString(36);
    return this.prismaWriteClient.platformBilling.create({
      data: {
        id: orgId,
        customerId: `cus_123_${randomString}`,
        subscriptionId: `sub_123_${randomString}`,
        plan: "STARTER",
      },
    });
  }

  async deleteSubscriptionForTeam(teamId: number) {
    // silently try to delete the subscription
    try {
      await this.prismaWriteClient.platformBilling.delete({
        where: {
          id: teamId,
        },
      });
    } catch (err) {
      console.error(err);
    }
  }
}
