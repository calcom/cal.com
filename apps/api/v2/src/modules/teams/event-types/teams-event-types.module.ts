import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/controllers/pipes/event-types/team-event-types-response.transformer";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
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
  ],
  providers: [
    TeamsEventTypesRepository,
    TeamsEventTypesService,
    InputOrganizationsEventTypesService,
    OrganizationsTeamsRepository,
    OutputTeamEventTypesResponsePipe,
    OutputOrganizationsEventTypesService,
  ],
  exports: [TeamsEventTypesRepository, TeamsEventTypesService],
  controllers: [TeamsEventTypesController],
})
export class TeamsEventTypesModule {}
