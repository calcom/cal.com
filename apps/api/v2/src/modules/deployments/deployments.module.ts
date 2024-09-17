import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, DeploymentsService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
