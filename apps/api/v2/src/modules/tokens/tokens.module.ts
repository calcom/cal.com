import { JwtModule } from "@/modules/jwt/jwt.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { TokensService } from "@/modules/tokens/tokens.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, JwtModule],
  providers: [TokensRepository, TokensService],
  exports: [TokensRepository, TokensService],
})
export class TokensModule {}
