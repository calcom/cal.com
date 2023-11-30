import { OAuthClientController } from "@/modules/oAuth/cal/oauth-client.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepository } from "@/modules/repositories/oAuth/cal/oauth-client-repository.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  controllers: [OAuthClientController],
  providers: [OAuthClientRepository],
})
export class OAuthClientModule {}
