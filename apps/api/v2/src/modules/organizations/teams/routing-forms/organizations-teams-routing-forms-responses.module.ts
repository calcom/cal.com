import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsResponsesModule } from "@/modules/routing-forms-responses/routing-forms-responses.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsResponsesController } from "./controllers/organizations-teams-routing-forms-responses.controller";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsResponsesModule, RoutingFormsModule],
  providers: [OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [OrganizationsTeamsRoutingFormsResponsesController],
})
export class OrganizationsTeamsRoutingFormsModule {}
