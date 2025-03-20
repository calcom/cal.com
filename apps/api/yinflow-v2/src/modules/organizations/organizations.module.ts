import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "../../ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "../email/email.module";
import { EmailService } from "../email/email.service";
import { MembershipsRepository } from "../memberships/memberships.repository";
import { UserOOORepository } from "../ooo/repositories/ooo.repository";
import { UserOOOService } from "../ooo/services/ooo.service";
import { OrganizationsAttributesController } from "../organizations/attributes/index/controllers/organizations-attributes.controller";
import { OrganizationAttributesRepository } from "../organizations/attributes/index/organization-attributes.repository";
import { OrganizationAttributesService } from "../organizations/attributes/index/services/organization-attributes.service";
import { OrganizationAttributeOptionRepository } from "../organizations/attributes/options/organization-attribute-options.repository";
import { OrganizationsAttributesOptionsController } from "../organizations/attributes/options/organizations-attributes-options.controller";
import { OrganizationAttributeOptionService } from "../organizations/attributes/options/services/organization-attributes-option.service";
import { OrganizationsDelegationCredentialModule } from "../organizations/delegation-credentials/organizations-delegation-credential.module";
import { OrganizationsEventTypesController } from "../organizations/event-types/organizations-event-types.controller";
import { OrganizationsEventTypesRepository } from "../organizations/event-types/organizations-event-types.repository";
import { OutputTeamEventTypesResponsePipe } from "../organizations/event-types/pipes/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "../organizations/event-types/services/input.service";
import { OrganizationsEventTypesService } from "../organizations/event-types/services/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "../organizations/event-types/services/output.service";
import { OrganizationsRepository } from "../organizations/index/organizations.repository";
import { OrganizationsService } from "../organizations/index/organizations.service";
import { OrganizationsMembershipsController } from "../organizations/memberships/organizations-membership.controller";
import { OrganizationsMembershipRepository } from "../organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "../organizations/memberships/services/organizations-membership.service";
import { OrganizationsOrganizationsModule } from "../organizations/organizations/organizations-organizations.module";
import { OrganizationsSchedulesController } from "../organizations/schedules/organizations-schedules.controller";
import { OrganizationSchedulesRepository } from "../organizations/schedules/organizations-schedules.repository";
import { OrganizationsSchedulesService } from "../organizations/schedules/services/organizations-schedules.service";
import { OrganizationsTeamsController } from "../organizations/teams/index/organizations-teams.controller";
import { OrganizationsTeamsRepository } from "../organizations/teams/index/organizations-teams.repository";
import { OrganizationsTeamsService } from "../organizations/teams/index/services/organizations-teams.service";
import { OrganizationsTeamsMembershipsController } from "../organizations/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsMembershipsRepository } from "../organizations/teams/memberships/organizations-teams-memberships.repository";
import { OrganizationsTeamsMembershipsService } from "../organizations/teams/memberships/services/organizations-teams-memberships.service";
import { OrganizationsTeamsRoutingFormsModule } from "../organizations/teams/routing-forms/organizations-teams-routing-forms-responses.module";
import { OrganizationsTeamsSchedulesController } from "../organizations/teams/schedules/organizations-teams-schedules.controller";
import { OrganizationsUsersController } from "../organizations/users/index/controllers/organizations-users.controller";
import { OrganizationsUsersRepository } from "../organizations/users/index/organizations-users.repository";
import { OrganizationsUsersService } from "../organizations/users/index/services/organizations-users-service";
import { OrganizationsUsersOOOController } from "../organizations/users/ooo/controllers/organizations-users-ooo-controller";
import { OrgUsersOOORepository } from "../organizations/users/ooo/organizations-users-ooo.repository";
import { OrgUsersOOOService } from "../organizations/users/ooo/services/organization-users-ooo.service";
import { OrganizationsWebhooksController } from "../organizations/webhooks/controllers/organizations-webhooks.controller";
import { OrganizationsWebhooksRepository } from "../organizations/webhooks/organizations-webhooks.repository";
import { OrganizationsWebhooksService } from "../organizations/webhooks/services/organizations-webhooks.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { StripeModule } from "../stripe/stripe.module";
import { TeamsEventTypesModule } from "../teams/event-types/teams-event-types.module";
import { TeamsModule } from "../teams/teams/teams.module";
import { UsersModule } from "../users/users.module";
import { WebhooksService } from "../webhooks/services/webhooks.service";
import { WebhooksRepository } from "../webhooks/webhooks.repository";

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
    OrganizationsDelegationCredentialModule,
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
