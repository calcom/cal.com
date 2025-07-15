import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redisService";
import { Module } from "@nestjs/common";

import { DeploymentsRepository } from "./deploymentsRepository";
import { DeploymentsService } from "./deploymentsService";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, DeploymentsService, RedisService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
