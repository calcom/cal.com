import { OAuthClientController } from "@/modules/oauth/oauth-client.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepositoryModule } from "@/modules/repositories/oauth/oauth-client-repository.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, OAuthClientRepositoryModule],
  controllers: [OAuthClientController],
})
export class OAuthClientModule {}
