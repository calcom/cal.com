import { Module } from "@nestjs/common";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule, StripeModule],
  providers: [TeamsRepository, TeamsService, TeamsMembershipsRepository],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsModule {}
