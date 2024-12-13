import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsMembershipsController } from "@/modules/teams/memberships/controllers/teams-memberships.controller";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule, OrganizationsModule, MembershipsModule],
  providers: [TeamsMembershipsRepository, TeamsMembershipsService],
  controllers: [TeamsMembershipsController],
})
export class TeamsMembershipsModule {}
