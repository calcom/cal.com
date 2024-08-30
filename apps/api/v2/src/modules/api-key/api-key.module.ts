import { Module } from "@nestjs/common";
import { ApiKeyRepository } from "src/modules/api-key/api-key-repository";
import { PrismaModule } from "src/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
