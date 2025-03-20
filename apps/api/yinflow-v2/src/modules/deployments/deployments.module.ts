import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RedisService } from "../redis/redis.service";
import { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, DeploymentsService, RedisService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
