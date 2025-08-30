import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsConferencingModule } from "@/modules/organizations/conferencing/organizations-conferencing.module";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/event-types/pipes/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/event-types/services/input.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/event-types/services/output.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsEventTypesController } from "@/modules/teams/event-types/controllers/teams-event-types.controller";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MembershipsModule,
    EventTypesModule_2024_06_14,
    UsersModule,
    TeamsModule,
    OrganizationsConferencingModule,
  ],
  providers: [
    TeamsEventTypesRepository,
    TeamsEventTypesService,
    InputOrganizationsEventTypesService,
    OrganizationsTeamsRepository,
    OutputTeamEventTypesResponsePipe,
    OutputOrganizationsEventTypesService,
    ConferencingRepository,
  ],
  exports: [TeamsEventTypesRepository, TeamsEventTypesService],
  controllers: [TeamsEventTypesController],
})
export class TeamsEventTypesModule {}
