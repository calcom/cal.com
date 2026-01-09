import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/schedules/organizations-schedules.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsSchedulesController } from "@/modules/teams/schedules/controllers/teams-schedules.controller";
import { TeamsSchedulesService } from "@/modules/teams/schedules/services/teams-schedules.service";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule],
  providers: [
    TeamsRepository,
    TeamsService,
    TeamsMembershipsRepository,
    TeamsMembershipsService,
    OutputSchedulesService_2024_06_11,
    OrganizationSchedulesRepository,
    StripeService,
    UsersRepository,
    AppsRepository,
    CredentialsRepository,
    OrganizationsRepository,
    TeamsSchedulesService,
    OrganizationsTeamsRepository,
    SchedulesRepository_2024_06_11,
  ],
  controllers: [TeamsController, TeamsSchedulesController],
  exports: [TeamsRepository],
})
export class TeamsSchedulesModule {}
