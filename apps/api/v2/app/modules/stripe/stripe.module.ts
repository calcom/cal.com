import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeService } from "app/modules/stripe/stripe.service";

@Module({
  imports: [ConfigModule],
  exports: [StripeService],
  providers: [StripeService],
})
export class StripeModule {}
