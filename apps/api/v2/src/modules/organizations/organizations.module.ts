import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "@/modules/email/email.module";
import { EmailService } from "@/modules/email/email.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesController } from "@/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsMembershipsController } from "@/modules/organizations/controllers/memberships/organizations-membership.controller";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsMembershipsController } from "@/modules/organizations/controllers/teams/memberships/organizations-teams-memberships.controller";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsUsersController } from "@/modules/organizations/controllers/users/organizations-users.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/repositories/organizations-teams-memberships.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/services/organizations-teams-memberships.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
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
