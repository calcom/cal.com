import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teamsMembershipsService";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teamsMembershipsRepository";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teamsService";
import { TeamsRepository } from "@/modules/teams/teams/teamsRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule, StripeModule],
  providers: [TeamsRepository, TeamsService, TeamsMembershipsRepository, TeamsMembershipsService],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsModule {}
