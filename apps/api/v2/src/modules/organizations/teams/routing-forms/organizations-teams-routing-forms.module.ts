import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizationsRoutingFormsRepository";
import { OrganizationsRoutingFormsResponsesService } from "@/modules/organizations/routing-forms/services/organizationsRoutingFormsResponsesService";
import { SharedRoutingFormResponseService } from "@/modules/organizations/routing-forms/services/sharedRoutingFormResponseService";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizationsTeamsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsResponsesController } from "./controllers/organizations-teams-routing-forms-responses.controller";
import { OrganizationsTeamsRoutingFormsController } from "./controllers/organizations-teams-routing-forms.controller";
import { OrganizationsTeamsRoutingFormsRepository } from "./repositories/organizationsTeamsRoutingFormsRepository";
import { OrganizationsTeamsRoutingFormsResponsesRepository } from "./repositories/organizationsTeamsRoutingFormsResponsesRepository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "./services/organizationsTeamsRoutingFormsResponsesOutputService";
import { OrganizationsTeamsRoutingFormsResponsesService } from "./services/organizationsTeamsRoutingFormsResponsesService";
import { OrganizationsTeamsRoutingFormsService } from "./services/organizationsTeamsRoutingFormsService";

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    RedisModule,
    RoutingFormsModule,
    SlotsModule_2024_09_04,
    TeamsEventTypesModule,
  ],
  providers: [
    OrganizationsTeamsRoutingFormsService,
    OrganizationsTeamsRoutingFormsResponsesService,
    SharedRoutingFormResponseService,
    OrganizationsTeamsRoutingFormsResponsesOutputService,
    OrganizationsTeamsRoutingFormsResponsesRepository,
    OrganizationsTeamsRoutingFormsRepository,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    MembershipsRepository,
    OrganizationsRoutingFormsResponsesService,
    OrganizationsRoutingFormsRepository,
    EventTypesRepository_2024_06_14,
  ],
  controllers: [OrganizationsTeamsRoutingFormsResponsesController, OrganizationsTeamsRoutingFormsController],
})
export class OrganizationsTeamsRoutingFormsModule {}
