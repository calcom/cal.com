import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "app/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "app/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "app/modules/email/email.module";
import { EmailService } from "app/modules/email/email.service";
import { MembershipsRepository } from "app/modules/memberships/memberships.repository";
import { OrganizationsEventTypesController } from "app/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsMembershipsController } from "app/modules/organizations/controllers/memberships/organizations-membership.controller";
import { OrganizationsSchedulesController } from "app/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsMembershipsController } from "app/modules/organizations/controllers/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsController } from "app/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsUsersController } from "app/modules/organizations/controllers/users/organizations-users.controller";
import { OrganizationsRepository } from "app/modules/organizations/organizations.repository";
import { OrganizationsEventTypesRepository } from "app/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsMembershipRepository } from "app/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "app/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsMembershipsRepository } from "app/modules/organizations/repositories/organizations-teams-memberships.repository";
import { OrganizationsTeamsRepository } from "app/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "app/modules/organizations/repositories/organizations-users.repository";
import { InputOrganizationsEventTypesService } from "app/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "app/modules/organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "app/modules/organizations/services/event-types/output.service";
import { OrganizationsMembershipService } from "app/modules/organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "app/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsMembershipsService } from "app/modules/organizations/services/organizations-teams-memberships.service";
import { OrganizationsTeamsService } from "app/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "app/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "app/modules/organizations/services/organizations.service";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { RedisModule } from "app/modules/redis/redis.module";
import { StripeModule } from "app/modules/stripe/stripe.module";
import { UsersModule } from "app/modules/users/users.module";

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
