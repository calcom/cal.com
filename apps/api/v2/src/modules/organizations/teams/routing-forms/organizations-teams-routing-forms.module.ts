import { Module } from "@nestjs/common";
import { OrganizationsTeamsRoutingFormsController } from "./controllers/organizations-teams-routing-forms.controller";
import { OrganizationsTeamsRoutingFormsResponsesController } from "./controllers/organizations-teams-routing-forms-responses.controller";
import { OrganizationsTeamsRoutingFormsRepository } from "./repositories/organizations-teams-routing-forms.repository";
import { OrganizationsTeamsRoutingFormsResponsesRepository } from "./repositories/organizations-teams-routing-forms-responses.repository";
import { OrganizationsTeamsRoutingFormsService } from "./services/organizations-teams-routing-forms.service";
import { OrganizationsTeamsRoutingFormsResponsesService } from "./services/organizations-teams-routing-forms-responses.service";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "./services/organizations-teams-routing-forms-responses-output.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { OrganizationsRoutingFormsResponsesService } from "@/modules/organizations/routing-forms/services/organizations-routing-forms-responses.service";
import { SharedRoutingFormResponseService } from "@/modules/organizations/routing-forms/services/shared-routing-form-response.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";

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
