import { Module } from "@nestjs/common";

import { ApiKeyRepository } from "../api-key/api-key-repository";

@Module({
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
