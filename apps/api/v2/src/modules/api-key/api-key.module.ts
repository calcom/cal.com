import { Module } from "@nestjs/common";

import { ApiKeyRepository } from "../api-key/api-key-repository";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
