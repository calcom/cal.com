import { getEnv } from "@/env";
import { TokensRepository } from "@/modules/repositories/tokens/tokens.repository";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      secret: getEnv("NEXTAUTH_SECRET"),
    }),
    PrismaModule,
  ],
  providers: [TokensRepository],
  exports: [TokensRepository],
})
export class TokensModule {}
