import { Module } from "@nestjs/common";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingReportRepository } from "@/lib/repositories/prisma-booking-report.repository";
import { PrismaWatchlistRepository } from "@/lib/repositories/prisma-watchlist.repository";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsUsersRepository } from "@/modules/organizations//users/index/organizations-users.repository";
import { OrganizationsBookingsController } from "@/modules/organizations/bookings/organizations-bookings.controller";
import { OrganizationsBookingsSpamReportService } from "@/modules/organizations/bookings/services/organizations-bookings-spam-report.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsUsersService } from "@/modules/organizations/users/index/services/organizations-users-service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";

@Module({
  imports: [BookingsModule_2024_08_13, PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersService,
    OrganizationsUsersRepository,
    OrganizationsBookingsSpamReportService,
    PrismaBookingRepository,
    PrismaBookingReportRepository,
    PrismaWatchlistRepository,
  ],
  controllers: [OrganizationsBookingsController],
})
export class OrganizationsBookingsModule {}
