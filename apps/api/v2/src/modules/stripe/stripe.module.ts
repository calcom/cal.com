import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeService } from "src/modules/stripe/stripe.service";

@Module({
  imports: [ConfigModule],
  exports: [StripeService],
  providers: [StripeService],
})
export class StripeModule {}
