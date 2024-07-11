import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
