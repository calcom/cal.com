import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule],
  providers: [OAuthClientRepository, JwtService],
  exports: [OAuthClientRepository],
})
export class OAuthClientRepositoryModule {}
