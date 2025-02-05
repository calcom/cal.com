import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { BookingsController_2024_08_13 } from "@/ee/bookings/2024-08-13/controllers/bookings.controller";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { BillingModule } from "@/modules/billing/billing.module";
import { BookingSeatModule } from "@/modules/booking-seat/booking-seat.module";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule, TokensModule, BillingModule, UsersModule, BookingSeatModule],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    BookingsService_2024_08_13,
    InputBookingsService_2024_08_13,
    OutputBookingsService_2024_08_13,
    BookingsRepository_2024_08_13,
    EventTypesRepository_2024_06_14,
    BookingSeatRepository,
    ApiKeyRepository,
  ],
  controllers: [BookingsController_2024_08_13],
  exports: [InputBookingsService_2024_08_13, OutputBookingsService_2024_08_13, BookingsService_2024_08_13],
})
export class BookingsModule_2024_08_13 {}
