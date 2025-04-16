import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsRoutingFormsResponsesController } from "./controllers/organizations-routing-forms-responses.controller";
import { OrganizationsRoutingFormsController } from "./controllers/organizations-routing-forms.controller";
import { OrganizationsRoutingFormsRepository } from "./organizations-routing-forms.repository";
import { OrganizationsRoutingFormsResponsesService } from "./services/organizations-routing-forms-responses.service";
import { OrganizationsRoutingFormsService } from "./services/organizations-routing-forms.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsModule],
  providers: [
    MembershipsRepository,
    OrganizationsRepository,
    OrganizationsRoutingFormsRepository,
    OrganizationsRoutingFormsService,
    OrganizationsRoutingFormsResponsesService,
    OrganizationsTeamsRoutingFormsResponsesOutputService,
  ],
  controllers: [OrganizationsRoutingFormsController, OrganizationsRoutingFormsResponsesController],
})
export class OrganizationsRoutingFormsModule {}
