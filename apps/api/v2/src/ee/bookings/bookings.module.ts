import { Module } from "@nestjs/common";
import { BookingsController } from "src/ee/bookings/controllers/bookings.controller";
import { BillingModule } from "src/modules/billing/billing.module";
import { OAuthClientRepository } from "src/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "src/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { RedisModule } from "src/modules/redis/redis.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { TokensRepository } from "src/modules/tokens/tokens.repository";

@Module({
  imports: [PrismaModule, RedisModule, TokensModule, BillingModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository],
  controllers: [BookingsController],
})
export class BookingsModule {}
