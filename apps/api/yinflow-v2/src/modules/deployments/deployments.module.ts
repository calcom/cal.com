import { Module } from "@nestjs/common";

import { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";

@Module({
  providers: [DeploymentsRepository, DeploymentsService],
  exports: [DeploymentsRepository, DeploymentsService],
})
export class DeploymentsModule {}
