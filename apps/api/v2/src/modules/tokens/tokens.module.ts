import { Module } from "@nestjs/common";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { TokensRepository } from "src/modules/tokens/tokens.repository";

@Module({
  imports: [PrismaModule],
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
