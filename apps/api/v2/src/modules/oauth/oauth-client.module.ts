import { OAuthClientController } from "@/modules/oauth/oauth-client.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [OAuthClientRepository],
  controllers: [OAuthClientController],
})
export class OAuthClientModule {}
