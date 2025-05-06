import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { OrganizationsRoutingFormsResponsesService } from "@/modules/organizations/routing-forms/services/organizations-routing-forms-responses.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsResponsesController } from "./controllers/organizations-teams-routing-forms-responses.controller";
import { OrganizationsTeamsRoutingFormsController } from "./controllers/organizations-teams-routing-forms.controller";
import { OrganizationsTeamsRoutingFormsResponsesRepository } from "./repositories/organizations-teams-routing-forms-responses.repository";
import { OrganizationsTeamsRoutingFormsRepository } from "./repositories/organizations-teams-routing-forms.repository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "./services/organizations-teams-routing-forms-responses-output.service";
import { OrganizationsTeamsRoutingFormsResponsesService } from "./services/organizations-teams-routing-forms-responses.service";
import { OrganizationsTeamsRoutingFormsService } from "./services/organizations-teams-routing-forms.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsModule],
  providers: [
    OrganizationsTeamsRoutingFormsService,
    OrganizationsTeamsRoutingFormsResponsesService,
    OrganizationsTeamsRoutingFormsResponsesOutputService,
    OrganizationsTeamsRoutingFormsResponsesRepository,
    OrganizationsTeamsRoutingFormsRepository,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    MembershipsRepository,
    OrganizationsRoutingFormsResponsesService,
    OrganizationsRoutingFormsRepository,
  ],
  controllers: [OrganizationsTeamsRoutingFormsResponsesController, OrganizationsTeamsRoutingFormsController],
})
export class OrganizationsTeamsRoutingFormsModule {}
