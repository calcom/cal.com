import { Module } from "@nestjs/common";
import { OrganizationsRoutingFormsController } from "./controllers/organizations-routing-forms.controller";
import { OrganizationsRoutingFormsResponsesController } from "./controllers/organizations-routing-forms-responses.controller";
import { OrganizationsRoutingFormsRepository } from "./organizations-routing-forms.repository";
import { OrganizationsRoutingFormsService } from "./services/organizations-routing-forms.service";
import { OrganizationsRoutingFormsResponsesService } from "./services/organizations-routing-forms-responses.service";
import { SharedRoutingFormResponseService } from "./services/shared-routing-form-response.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { IsUserRoutingForm } from "@/modules/auth/guards/organizations/is-user-routing-form.guard";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";

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
