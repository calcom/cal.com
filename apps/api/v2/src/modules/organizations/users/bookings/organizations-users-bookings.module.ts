import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsUsersBookingsController } from "@/modules/organizations/users/bookings/controllers/organizations-users-bookings-controller";
import { OrganizationUsersBookingsService } from "@/modules/organizations/users/bookings/services/organization-users-bookings.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    BookingsModule_2024_08_13,
    UsersModule,
    PrismaModule,
    StripeModule,
    RedisModule,
    MembershipsModule,
  ],
  providers: [OrganizationUsersBookingsService, OrganizationsRepository],
  controllers: [OrganizationsUsersBookingsController],
})
export class OrganizationsUsersBookingsModule {}
