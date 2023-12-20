import { getEnv } from "@/env";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
