import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule, StripeModule],
  providers: [TeamsRepository, TeamsService],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsModule {}
