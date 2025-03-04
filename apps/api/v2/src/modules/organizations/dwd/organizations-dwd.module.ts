import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsDwdController } from "@/modules/organizations/dwd/organizations-dwd.controller";
import { OrganizationsDwdRepository } from "@/modules/organizations/dwd/organizations-dwd.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsDwdService } from "./services/organizations-dwd.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [OrganizationsDwdService, OrganizationsDwdRepository, OrganizationsRepository],
  controllers: [OrganizationsDwdController],
})
export class OrganizationsDwdModule {}
