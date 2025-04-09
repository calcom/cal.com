import { OrganizationAttributeOptionService } from "@/modules/organizations/attributes/options/services/organization-attributes-option.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsUsersController } from "./organizations-teams-users.controller";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule],
  providers: [OrganizationAttributeOptionService],
  controllers: [OrganizationsTeamsUsersController],
})
export class OrganizationsTeamsUsersModule {}
