import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "@/modules/email/email.module";
import { EmailService } from "@/modules/email/email.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrganizationsOptionsAttributesController } from "@/modules/organizations/controllers/attributes/organizations-attributes-options.controller";
import { OrganizationsAttributesController } from "@/modules/organizations/controllers/attributes/organizations-attributes.controller";
import { OrganizationsEventTypesController } from "@/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsMembershipsController } from "@/modules/organizations/controllers/memberships/organizations-membership.controller";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/controllers/pipes/event-types/team-event-types-response.transformer";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsMembershipsController } from "@/modules/organizations/controllers/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsTeamsSchedulesController } from "@/modules/organizations/controllers/teams/schedules/organizations-teams-schedules.controller";
import { OrganizationsUsersOOOController } from "@/modules/organizations/controllers/users/ooo/organizations-users-ooo-controller";
import { OrgUsersOOORepository } from "@/modules/organizations/controllers/users/ooo/repositories/organizations-users-ooo.repository";
import { OrgUsersOOOService } from "@/modules/organizations/controllers/users/ooo/services/organization-users-ooo.service";
import { OrganizationsUsersController } from "@/modules/organizations/controllers/users/organizations-users.controller";
import { OrganizationsWebhooksController } from "@/modules/organizations/controllers/webhooks/organizations-webhooks.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/repositories/attributes/organization-attribute-option.repository";
import { OrganizationAttributesRepository } from "@/modules/organizations/repositories/attributes/organization-attribute.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/repositories/organizations-teams-memberships.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { OrganizationsWebhooksRepository } from "@/modules/organizations/repositories/organizations-webhooks.repository";
import { OrganizationAttributeOptionService } from "@/modules/organizations/services/attributes/organization-attributes-option.service";
import { OrganizationAttributesService } from "@/modules/organizations/services/attributes/organization-attributes.service";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/services/organizations-teams-memberships.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { OrganizationsWebhooksService } from "@/modules/organizations/services/organizations-webhooks.service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
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
    OrganizationsOptionsAttributesController,
    OrganizationsWebhooksController,
    OrganizationsTeamsSchedulesController,
    OrganizationsUsersOOOController,
  ],
})
export class OrganizationsModule {}
