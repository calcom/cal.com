import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { Module } from "@nestjs/common";

import { PrismaDeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [PrismaModule],
  providers: [PrismaDeploymentsRepository, DeploymentsService, RedisService],
  exports: [PrismaDeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
