import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { Module } from "@nestjs/common";

import { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, DeploymentsService, RedisService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
