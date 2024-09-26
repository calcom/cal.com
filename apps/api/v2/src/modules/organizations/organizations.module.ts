import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "../../ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "../email/email.module";
import { EmailService } from "../email/email.service";
import { MembershipsRepository } from "../memberships/memberships.repository";
import { OrganizationsEventTypesController } from "../organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsMembershipsController } from "../organizations/controllers/memberships/organizations-membership.controller";
import { OrganizationsSchedulesController } from "../organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsMembershipsController } from "../organizations/controllers/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsController } from "../organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsUsersController } from "../organizations/controllers/users/organizations-users.controller";
import { OrganizationsRepository } from "../organizations/organizations.repository";
import { OrganizationsEventTypesRepository } from "../organizations/repositories/organizations-event-types.repository";
import { OrganizationsMembershipRepository } from "../organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "../organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsMembershipsRepository } from "../organizations/repositories/organizations-teams-memberships.repository";
import { OrganizationsTeamsRepository } from "../organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "../organizations/repositories/organizations-users.repository";
import { InputOrganizationsEventTypesService } from "../organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "../organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "../organizations/services/event-types/output.service";
import { OrganizationsMembershipService } from "../organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "../organizations/services/organizations-schedules.service";
import { OrganizationsTeamsMembershipsService } from "../organizations/services/organizations-teams-memberships.service";
import { OrganizationsTeamsService } from "../organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "../organizations/services/organizations-users-service";
import { OrganizationsService } from "../organizations/services/organizations.service";
import { StripeModule } from "../stripe/stripe.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [StripeModule, SchedulesModule_2024_06_11, UsersModule, EmailModule, EventTypesModule_2024_06_14],
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
  ],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsUsersController,
    OrganizationsMembershipsController,
    OrganizationsEventTypesController,
    OrganizationsTeamsMembershipsController,
  ],
})
export class OrganizationsModule {}
