import { CalProviderController } from "@/ee/atoms/controllers/cal-provider/cal-provider.controller";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  controllers: [CalProviderController],
})
export class AtomsModule {}
