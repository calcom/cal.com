import { BookingsController } from "@/ee/bookings/controllers/bookings.controller";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [TokensRepository, OAuthFlowService],
  controllers: [BookingsController],
})
export class BookingsModule {}
