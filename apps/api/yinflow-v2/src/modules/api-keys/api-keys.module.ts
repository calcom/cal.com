import { Module } from "@nestjs/common";

import { ApiKeysRepository } from "../api-keys/api-keys-repository";
import { ApiKeysController } from "../api-keys/controllers/api-keys.controller";
import { ApiKeysService } from "../api-keys/services/api-keys.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeysRepository, ApiKeysService],
  controllers: [ApiKeysController],
  exports: [ApiKeysRepository, ApiKeysService],
})
export class ApiKeysModule {}
