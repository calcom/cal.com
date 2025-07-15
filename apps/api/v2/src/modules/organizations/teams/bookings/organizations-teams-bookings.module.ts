import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookingReferencesRepository";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookingsRepository";
import { BookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookingReferencesService";
import { OutputBookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/outputBookingReferencesService";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsTeamsBookingsController } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.controller";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizationsTeamsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [BookingsModule_2024_08_13, PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    BookingReferencesService_2024_08_13,
    BookingReferencesRepository_2024_08_13,
    BookingsRepository_2024_08_13,
    OutputBookingReferencesService_2024_08_13,
  ],
  controllers: [OrganizationsTeamsBookingsController],
})
export class OrganizationsTeamsBookingsModule {}
