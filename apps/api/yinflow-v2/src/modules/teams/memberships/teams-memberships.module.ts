import { Module } from "@nestjs/common";

import { MembershipsModule } from "../../memberships/memberships.module";
import { OrganizationsModule } from "../../organizations/organizations.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { TeamsEventTypesModule } from "../../teams/event-types/teams-event-types.module";
import { TeamsMembershipsController } from "../../teams/memberships/controllers/teams-memberships.controller";
import { TeamsMembershipsService } from "../../teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "../../teams/memberships/teams-memberships.repository";

@Module({
  imports: [PrismaModule, RedisModule, OrganizationsModule, MembershipsModule, TeamsEventTypesModule],
  providers: [TeamsMembershipsRepository, TeamsMembershipsService],
  controllers: [TeamsMembershipsController],
})
export class TeamsMembershipsModule {}
