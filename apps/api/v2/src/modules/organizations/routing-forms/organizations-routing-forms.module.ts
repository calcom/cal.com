import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { IsUserRoutingForm } from "@/modules/auth/guards/organizations/is-user-routing-form.guard";
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
import { SharedRoutingFormResponseService } from "./services/sharedRoutingFormResponseService";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsModule, SlotsModule_2024_09_04],
  providers: [
    IsUserRoutingForm,
    MembershipsRepository,
    OrganizationsRepository,
    OrganizationsRoutingFormsRepository,
    OrganizationsRoutingFormsService,
    OrganizationsRoutingFormsResponsesService,
    SharedRoutingFormResponseService,
    OrganizationsTeamsRoutingFormsResponsesOutputService,
    TeamsEventTypesRepository,
    EventTypesRepository_2024_06_14,
  ],
  controllers: [OrganizationsRoutingFormsController, OrganizationsRoutingFormsResponsesController],
})
export class OrganizationsRoutingFormsModule {}
