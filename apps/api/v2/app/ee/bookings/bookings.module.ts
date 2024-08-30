import { Module } from "@nestjs/common";
import { BookingsController } from "app/ee/bookings/controllers/bookings.controller";
import { BillingModule } from "app/modules/billing/billing.module";
import { OAuthClientRepository } from "app/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "app/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { RedisModule } from "app/modules/redis/redis.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { TokensRepository } from "app/modules/tokens/tokens.repository";

@Module({
  imports: [PrismaModule, RedisModule, TokensModule, BillingModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository],
  controllers: [BookingsController],
})
export class BookingsModule {}
