import { Module } from "@nestjs/common";

import { OrganizationsRepository } from "../../../organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "../../../organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "../../../prisma/prisma.module";
import { RedisModule } from "../../../redis/redis.module";
import { RoutingFormsResponsesModule } from "../../../routing-forms-responses/routing-forms-responses.module";
import { RoutingFormsModule } from "../../../routing-forms/routing-forms.module";
import { StripeModule } from "../../../stripe/stripe.module";
import { OrganizationsTeamsRoutingFormsResponsesController } from "./controllers/organizations-teams-routing-forms-responses.controller";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsResponsesModule, RoutingFormsModule],
  providers: [OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [OrganizationsTeamsRoutingFormsResponsesController],
})
export class OrganizationsTeamsRoutingFormsModule {}
