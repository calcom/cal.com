import { BookingsController } from "@/ee/bookings/controllers/bookings.controller";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [TokensRepository, OAuthFlowService],
  controllers: [BookingsController],
})
export class BookingsModule {}
