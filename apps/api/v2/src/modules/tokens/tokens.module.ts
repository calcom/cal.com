import { Module } from "@nestjs/common";

import { TokensRepository } from "../tokens/tokens.repository";

@Module({
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
