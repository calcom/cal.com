import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationSchedulesRepository } from "@/modules/organizations/schedules/organizations-schedules.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    MembershipsModule,
    RedisModule,
    OutputSchedulesService_2024_06_11,
    OrganizationSchedulesRepository,
  ],
  providers: [TeamsRepository, TeamsService, TeamsMembershipsRepository, TeamsMembershipsService],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsSchedulesModule {}
