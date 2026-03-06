import { Module } from "@nestjs/common";
import { IsUserInTeam } from "@/modules/auth/guards/users/is-user-in-team.guard";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsOOOController } from "@/modules/teams/ooo/teams-ooo.controller";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [PrismaModule, RedisModule, MembershipsModule, UsersModule],
  providers: [UserOOOService, UserOOORepository, IsUserInTeam],
  controllers: [TeamsOOOController],
})
export class TeamsOOOModule {}
