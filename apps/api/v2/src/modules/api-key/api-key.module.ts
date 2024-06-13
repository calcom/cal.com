import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { ApiKeyService } from "@/modules/api-key/api-key.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyService, ApiKeyRepository],
  exports: [ApiKeyService, ApiKeyRepository],
})
export class ApiKeyModule {}
