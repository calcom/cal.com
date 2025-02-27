import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "@/modules/email/email.module";
import { EmailService } from "@/modules/email/email.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrganizationsAttributesController } from "@/modules/organizations/attributes/index/controllers/organizations-attributes.controller";
import { OrganizationAttributesRepository } from "@/modules/organizations/attributes/index/organization-attributes.repository";
import { OrganizationAttributesService } from "@/modules/organizations/attributes/index/services/organization-attributes.service";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/attributes/options/organization-attribute-options.repository";
import { OrganizationsAttributesOptionsController } from "@/modules/organizations/attributes/options/organizations-attributes-options.controller";
import { OrganizationAttributeOptionService } from "@/modules/organizations/attributes/options/services/organization-attributes-option.service";
import { OrganizationsEventTypesController } from "@/modules/organizations/event-types/organizations-event-types.controller";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/event-types/organizations-event-types.repository";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/event-types/pipes/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/event-types/services/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/event-types/services/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/event-types/services/output.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsService } from "@/modules/organizations/index/organizations.service";
import { OrganizationsMembershipsController } from "@/modules/organizations/memberships/organizations-membership.controller";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { OrganizationsOrganizationsModule } from "@/modules/organizations/organizations/organizations-organizations.module";
import { OrganizationsSchedulesController } from "@/modules/organizations/schedules/organizations-schedules.controller";
import { OrganizationSchedulesRepository } from "@/modules/organizations/schedules/organizations-schedules.repository";
import { OrganizationsSchedulesService } from "@/modules/organizations/schedules/services/organizations-schedules.service";
import { OrganizationsTeamsController } from "@/modules/organizations/teams/index/organizations-teams.controller";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsTeamsService } from "@/modules/organizations/teams/index/services/organizations-teams.service";
import { OrganizationsTeamsMembershipsController } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.repository";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/teams/memberships/services/organizations-teams-memberships.service";
import { OrganizationsTeamsRoutingFormsModule } from "@/modules/organizations/teams/routing-forms/organizations-teams-routing-forms-responses.module";
import { OrganizationsTeamsSchedulesController } from "@/modules/organizations/teams/schedules/organizations-teams-schedules.controller";
import { OrganizationsUsersController } from "@/modules/organizations/users/index/controllers/organizations-users.controller";
import { OrganizationsUsersRepository } from "@/modules/organizations/users/index/organizations-users.repository";
import { OrganizationsUsersService } from "@/modules/organizations/users/index/services/organizations-users-service";
import { OrganizationsUsersOOOController } from "@/modules/organizations/users/ooo/controllers/organizations-users-ooo-controller";
import { OrgUsersOOORepository } from "@/modules/organizations/users/ooo/organizations-users-ooo.repository";
import { OrgUsersOOOService } from "@/modules/organizations/users/ooo/services/organization-users-ooo.service";
import { OrganizationsWebhooksController } from "@/modules/organizations/webhooks/controllers/organizations-webhooks.controller";
import { OrganizationsWebhooksRepository } from "@/modules/organizations/webhooks/organizations-webhooks.repository";
import { OrganizationsWebhooksService } from "@/modules/organizations/webhooks/services/organizations-webhooks.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { UsersModule } from "@/modules/users/users.module";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    SchedulesModule_2024_06_11,
    UsersModule,
    RedisModule,
    EmailModule,
    EventTypesModule_2024_06_14,
    TeamsEventTypesModule,
    TeamsModule,
    OrganizationsOrganizationsModule,
    OrganizationsTeamsRoutingFormsModule,
  ],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    EmailService,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
    OrganizationsEventTypesService,
    InputOrganizationsEventTypesService,
    OutputOrganizationsEventTypesService,
    OrganizationsEventTypesRepository,
    OrganizationsTeamsMembershipsRepository,
    OrganizationsTeamsMembershipsService,
    OrganizationAttributesService,
    OrganizationAttributeOptionService,
    OrganizationAttributeOptionRepository,
    OrganizationAttributesRepository,
    OrganizationsWebhooksRepository,
    OrganizationsWebhooksService,
    WebhooksRepository,
    WebhooksService,
    OutputTeamEventTypesResponsePipe,
    UserOOOService,
    UserOOORepository,
    OrgUsersOOOService,
    OrgUsersOOORepository,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
    OrganizationsTeamsMembershipsRepository,
    OrganizationsTeamsMembershipsService,
    OrganizationAttributesService,
    OrganizationAttributeOptionService,
    OrganizationAttributeOptionRepository,
    OrganizationAttributesRepository,
    OrganizationsWebhooksRepository,
    OrganizationsWebhooksService,
    WebhooksRepository,
    WebhooksService,
    OrganizationsEventTypesService,
  ],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsUsersController,
    OrganizationsMembershipsController,
    OrganizationsEventTypesController,
    OrganizationsTeamsMembershipsController,
    OrganizationsAttributesController,
    OrganizationsAttributesOptionsController,
    OrganizationsWebhooksController,
    OrganizationsTeamsSchedulesController,
    OrganizationsUsersOOOController,
  ],
})
export class OrganizationsModule {}
