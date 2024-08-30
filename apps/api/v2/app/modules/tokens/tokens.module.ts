import { Module } from "@nestjs/common";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { TokensRepository } from "app/modules/tokens/tokens.repository";

@Module({
  imports: [PrismaModule],
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
