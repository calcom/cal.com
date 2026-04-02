import { Module } from "@nestjs/common";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsInviteController } from "@/modules/teams/invite/controllers/teams-invite.controller";

@Module({
  imports: [PrismaModule, RedisModule, MembershipsModule],
  controllers: [TeamsInviteController],
})
export class TeamsInviteModule {}
