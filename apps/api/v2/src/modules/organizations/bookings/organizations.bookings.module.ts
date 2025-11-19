import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsUsersRepository } from "@/modules/organizations//users/index/organizations-users.repository";
import { OrganizationsBookingsController } from "@/modules/organizations/bookings/organizations-bookings.controller";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsUsersService } from "@/modules/organizations/users/index/services/organizations-users-service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [BookingsModule_2024_08_13, PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersService,
    OrganizationsUsersRepository,
  ],
  controllers: [OrganizationsBookingsController],
})
export class OrganizationsBookingsModule {}
