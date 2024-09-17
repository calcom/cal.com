import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { TokensRepository } from "../tokens/tokens.repository";

@Module({
  imports: [PrismaModule],
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
