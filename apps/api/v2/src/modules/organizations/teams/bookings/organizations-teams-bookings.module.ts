import { Module } from "@nestjs/common";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-references.service";
import { OutputBookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output-booking-references.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsBookingsController } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.controller";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";

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
