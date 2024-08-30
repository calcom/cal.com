import { Module } from "@nestjs/common";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { RedisService } from "app/modules/redis/redis.service";

import { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, DeploymentsService, RedisService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
