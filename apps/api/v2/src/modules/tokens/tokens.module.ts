import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
