import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsTeamsBookingsController } from "@/modules/organizations/controllers/teams/bookings/organizations-teams-bookings.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [BookingsModule_2024_08_13, PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [OrganizationsTeamsBookingsController],
})
export class OrganizationsTeamsBookingsModule {}
