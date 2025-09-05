import { Module } from "@nestjs/common";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { ApiKeysController } from "@/modules/api-keys/controllers/api-keys.controller";
import { ApiKeysService } from "@/modules/api-keys/services/api-keys.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeysRepository, ApiKeysService],
  controllers: [ApiKeysController],
  exports: [ApiKeysRepository, ApiKeysService],
})
export class ApiKeysModule {}
