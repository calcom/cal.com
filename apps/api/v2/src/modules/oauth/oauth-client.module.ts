import { AuthModule } from "@/modules/auth/auth.module";
import { OAuthClientController } from "@/modules/oauth/oauth-client.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { OAuthClientRepositoryModule } from "@/modules/repositories/oauth/oauth-client-repository.module";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, OAuthClientRepositoryModule, AuthModule, UserModule],
  controllers: [OAuthClientController],
})
export class OAuthClientModule {}
