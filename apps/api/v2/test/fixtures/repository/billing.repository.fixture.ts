import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class PlatformBillingRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(orgId: number, plan?: string) {
    const randomString = Date.now().toString(36);
    return this.prismaWriteClient.platformBilling.create({
      data: {
        id: orgId,
        customerId: `cus_123_${randomString}`,
        subscriptionId: `sub_123_${randomString}`,
        plan: plan || "FREE",
      },
    });
  }

  async get(orgId: number) {
    return this.prismaWriteClient.platformBilling.findFirst({
      where: {
        id: orgId,
      },
      include: {
        managerBilling: true,
        managedBillings: true,
      },
    });
  }

  async getByCustomerSubscriptionIds(customerId: string, subscriptionId: string) {
    return this.prismaWriteClient.platformBilling.findMany({
      where: {
        customerId,
        subscriptionId,
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
