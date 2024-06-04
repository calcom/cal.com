import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";

@Injectable()
export class BillingRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async createSubscriptionForTeam(teamId: number, plan: string) {
    return this.prismaWriteClient.platformBilling.create({
      data: {
        id: teamId,
        plan,
        customerId: "cus_123",
        subscriptionId: "sub_123",
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
