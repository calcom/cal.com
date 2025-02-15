import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsDwdController } from "@/modules/organizations/dwd/organizations-dwd.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsDwdService } from "./services/organizations-dwd.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [OrganizationsDwdService, OrganizationsRepository],
  controllers: [OrganizationsDwdController],
})
export class OrganizationsDwdModule {}
