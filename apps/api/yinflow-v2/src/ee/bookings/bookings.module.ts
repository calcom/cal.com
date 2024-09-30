import { Module } from "@nestjs/common";

import { BillingModule } from "../../modules/billing/billing.module";
import { OAuthClientRepository } from "../../modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "../../modules/oauth-clients/services/oauth-flow.service";
import { TokensModule } from "../../modules/tokens/tokens.module";
import { TokensRepository } from "../../modules/tokens/tokens.repository";
import { BookingsController } from "../bookings/controllers/bookings.controller";

@Module({
  imports: [TokensModule, BillingModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository],
  controllers: [BookingsController],
})
export class BookingsModule {}
