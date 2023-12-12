import { getEnv } from "@/env";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: getEnv("JWT_SECRET") })],
  providers: [OAuthClientRepository],
  exports: [OAuthClientRepository],
})
export class OAuthClientRepositoryModule {}
