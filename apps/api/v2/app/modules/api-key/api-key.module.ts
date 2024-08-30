import { Module } from "@nestjs/common";
import { ApiKeyRepository } from "app/modules/api-key/api-key-repository";
import { PrismaModule } from "app/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
