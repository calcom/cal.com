import { ManagedUsersBillingRepository as BaseManagedUsersBillingRepository } from "@calcom/platform-libraries/organizations";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

@Injectable()
export class ManagedUsersBillingRepository extends BaseManagedUsersBillingRepository {
  constructor(dbRead: PrismaReadService) {
    super(dbRead.prisma as unknown as PrismaClient);
  }
}
