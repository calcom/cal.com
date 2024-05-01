import { BookingsController } from "@/ee/bookings/controllers/bookings.controller";
import { BillingModule } from "@/modules/billing/billing.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule, TokensModule, BillingModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository],
  controllers: [BookingsController],
})
export class BookingsModule {}
