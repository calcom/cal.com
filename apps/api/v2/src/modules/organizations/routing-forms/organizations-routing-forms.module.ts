import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizationsTeamsRoutingFormsResponsesOutputService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teamsEventTypesRepository";
import { Module } from "@nestjs/common";

import { OrganizationsRoutingFormsResponsesController } from "./controllers/organizations-routing-forms-responses.controller";
import { OrganizationsRoutingFormsController } from "./controllers/organizations-routing-forms.controller";
import { OrganizationsRoutingFormsRepository } from "./organizationsRoutingFormsRepository";
import { OrganizationsRoutingFormsResponsesService } from "./services/organizationsRoutingFormsResponsesService";
import { OrganizationsRoutingFormsService } from "./services/organizationsRoutingFormsService";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsModule, SlotsModule_2024_09_04],
  providers: [
    MembershipsRepository,
    OrganizationsRepository,
    OrganizationsRoutingFormsRepository,
    OrganizationsRoutingFormsService,
    OrganizationsRoutingFormsResponsesService,
    OrganizationsTeamsRoutingFormsResponsesOutputService,
    TeamsEventTypesRepository,
  ],
  controllers: [OrganizationsRoutingFormsController, OrganizationsRoutingFormsResponsesController],
})
export class OrganizationsRoutingFormsModule {}
