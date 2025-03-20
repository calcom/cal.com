import { Module } from "@nestjs/common";

import { MembershipsModule } from "../../memberships/memberships.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { StripeModule } from "../../stripe/stripe.module";
import { TeamsMembershipsService } from "../../teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "../../teams/memberships/teams-memberships.repository";
import { TeamsController } from "../../teams/teams/controllers/teams.controller";
import { TeamsService } from "../../teams/teams/services/teams.service";
import { TeamsRepository } from "../../teams/teams/teams.repository";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule, StripeModule],
  providers: [TeamsRepository, TeamsService, TeamsMembershipsRepository, TeamsMembershipsService],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsModule {}
