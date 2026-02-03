import { Logger, Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { OrganizationsEventTypesPrivateLinksController } from "@/ee/event-types-private-links/controllers/organizations-event-types-private-links.controller";
import { EventTypesPrivateLinksModule } from "@/ee/event-types-private-links/event-types-private-links.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { InputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/input-schedules.service";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { OrganizationMembershipService } from "@/lib/services/organization-membership.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { EmailModule } from "@/modules/email/email.module";
import { EmailService } from "@/modules/email/email.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrganizationsAttributesController } from "@/modules/organizations/attributes/index/controllers/organizations-attributes.controller";
import { OrganizationAttributesRepository } from "@/modules/organizations/attributes/index/organization-attributes.repository";
import { OrganizationAttributesService } from "@/modules/organizations/attributes/index/services/organization-attributes.service";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/attributes/options/organization-attribute-options.repository";
import { OrganizationsAttributesOptionsController } from "@/modules/organizations/attributes/options/organizations-attributes-options.controller";
import { OrganizationAttributeOptionService } from "@/modules/organizations/attributes/options/services/organization-attributes-option.service";
import { OrganizationsConferencingModule } from "@/modules/organizations/conferencing/organizations-conferencing.module";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { OrganizationsDelegationCredentialModule } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.module";
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
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { OrganizationsOrganizationsModule } from "@/modules/organizations/organizations/organizations-organizations.module";
import { OrganizationsRolesModule } from "@/modules/organizations/roles/organizations-roles.module";
import { OrganizationsSchedulesController } from "@/modules/organizations/schedules/organizations-schedules.controller";
import { OrganizationsSchedulesService } from "@/modules/organizations/schedules/services/organizations-schedules.service";
import { OrganizationsStripeModule } from "@/modules/organizations/stripe/organizations-stripe.module";
import { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizations-stripe.service";
import { OrganizationsTeamsController } from "@/modules/organizations/teams/index/organizations-teams.controller";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsTeamsService } from "@/modules/organizations/teams/index/services/organizations-teams.service";
import { OrganizationsTeamsInviteController } from "@/modules/organizations/teams/invite/organizations-teams-invite.controller";
import { OrganizationsTeamsMembershipsController } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.repository";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/teams/memberships/services/organizations-teams-memberships.service";
import { OrganizationsTeamsRolesModule } from "@/modules/organizations/teams/roles/organizations-teams-roles.module";
import { OrganizationsTeamsRoutingFormsModule } from "@/modules/organizations/teams/routing-forms/organizations-teams-routing-forms.module";
import { OrganizationsTeamsSchedulesController } from "@/modules/organizations/teams/schedules/organizations-teams-schedules.controller";
import { OrganizationTeamWorkflowsController } from "@/modules/organizations/teams/workflows/controllers/org-team-workflows.controller";
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
import { RedisService } from "@/modules/redis/redis.service";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsSchedulesService } from "@/modules/teams/schedules/services/teams-schedules.service";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { TeamEventTypeWorkflowsService } from "@/modules/workflows/services/team-event-type-workflows.service";
import { TeamRoutingFormWorkflowsService } from "@/modules/workflows/services/team-routing-form-workflows.service";
import { WorkflowsInputService } from "@/modules/workflows/services/workflows.input.service";
import { WorkflowsOutputService } from "@/modules/workflows/services/workflows.output.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";

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
    OrganizationsRolesModule,
    OrganizationsTeamsRolesModule,
    OrganizationsStripeModule,
    OrganizationsTeamsRoutingFormsModule,
    MembershipsModule,
    OrganizationsConferencingModule,
    EventTypesPrivateLinksModule,
  ],
  providers: [
    OrganizationsRepository,
    OrganizationMembershipService,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    OrganizationsSchedulesService,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    EmailService,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
    OrganizationsMembershipOutputService,
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
    OrganizationsConferencingService,
    OrganizationsStripeService,
    CredentialsRepository,
    AppsRepository,
    RedisService,
    ConferencingRepository,
    GoogleMeetService,
    ConferencingService,
    ZoomVideoService,
    Office365VideoService,
    TokensRepository,
    TeamsVerifiedResourcesRepository,
    WorkflowsRepository,
    TeamEventTypeWorkflowsService,
    TeamRoutingFormWorkflowsService,
    WorkflowsInputService,
    WorkflowsOutputService,
    TeamsSchedulesService,
    SchedulesService_2024_06_11,
    InputSchedulesService_2024_06_11,
    TeamsMembershipsService,
    TeamsMembershipsRepository,
    OAuthClientRepository,
    Logger,
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
    OrganizationsConferencingService,
    OrganizationsStripeService,
    OrganizationMembershipService,
  ],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsUsersController,
    OrganizationsMembershipsController,
    OrganizationsEventTypesController,
    OrganizationsTeamsMembershipsController,
    OrganizationsTeamsInviteController,
    OrganizationsAttributesController,
    OrganizationsAttributesOptionsController,
    OrganizationsWebhooksController,
    OrganizationsTeamsSchedulesController,
    OrganizationsUsersOOOController,
    OrganizationTeamWorkflowsController,
    OrganizationsEventTypesPrivateLinksController,
  ],
})
export class OrganizationsModule {}
