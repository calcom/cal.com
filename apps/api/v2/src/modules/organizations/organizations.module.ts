import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "src/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "src/modules/email/email.module";
import { EmailService } from "src/modules/email/email.service";
import { MembershipsRepository } from "src/modules/memberships/memberships.repository";
import { OrganizationsEventTypesController } from "src/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsMembershipsController } from "src/modules/organizations/controllers/memberships/organizations-membership.controller";
import { OrganizationsSchedulesController } from "src/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsMembershipsController } from "src/modules/organizations/controllers/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsController } from "src/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsUsersController } from "src/modules/organizations/controllers/users/organizations-users.controller";
import { OrganizationsRepository } from "src/modules/organizations/organizations.repository";
import { OrganizationsEventTypesRepository } from "src/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsMembershipRepository } from "src/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "src/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsMembershipsRepository } from "src/modules/organizations/repositories/organizations-teams-memberships.repository";
import { OrganizationsTeamsRepository } from "src/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "src/modules/organizations/repositories/organizations-users.repository";
import { InputOrganizationsEventTypesService } from "src/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "src/modules/organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "src/modules/organizations/services/event-types/output.service";
import { OrganizationsMembershipService } from "src/modules/organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "src/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsMembershipsService } from "src/modules/organizations/services/organizations-teams-memberships.service";
import { OrganizationsTeamsService } from "src/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "src/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "src/modules/organizations/services/organizations.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { RedisModule } from "src/modules/redis/redis.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    SchedulesModule_2024_06_11,
    UsersModule,
    RedisModule,
    EmailModule,
    EventTypesModule_2024_06_14,
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
