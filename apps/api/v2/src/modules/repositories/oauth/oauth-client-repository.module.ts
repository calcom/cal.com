import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  exports: [OAuthClientRepository],
})
export class OAuthClientRepositoryModule {}
