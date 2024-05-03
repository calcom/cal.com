import { StripeService } from "@/modules/stripe/stripe.service";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  exports: [StripeService],
  providers: [StripeService],
})
export class StripeModule {}
