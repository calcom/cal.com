import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../../ee/event-types/event-types_2024_06_14/event-types.module";
import { MembershipsModule } from "../../memberships/memberships.module";
import { OutputTeamEventTypesResponsePipe } from "../../organizations/event-types/pipes/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "../../organizations/event-types/services/input.service";
import { OutputOrganizationsEventTypesService } from "../../organizations/event-types/services/output.service";
import { OrganizationsTeamsRepository } from "../../organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { TeamsEventTypesController } from "../../teams/event-types/controllers/teams-event-types.controller";
import { TeamsEventTypesService } from "../../teams/event-types/services/teams-event-types.service";
import { TeamsEventTypesRepository } from "../../teams/event-types/teams-event-types.repository";
import { TeamsModule } from "../../teams/teams/teams.module";
import { UsersModule } from "../../users/users.module";

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
