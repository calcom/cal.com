import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsInviteController } from "@/modules/teams/invite/controllers/teams-invite.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TeamsInviteController],
})
export class TeamsInviteModule {}
