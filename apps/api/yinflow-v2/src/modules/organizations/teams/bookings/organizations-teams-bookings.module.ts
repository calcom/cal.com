import { Module } from "@nestjs/common";

import { BookingsModule_2024_08_13 } from "../../../../ee/bookings/2024-08-13/bookings.module";
import { MembershipsModule } from "../../../memberships/memberships.module";
import { OrganizationsRepository } from "../../../organizations/index/organizations.repository";
import { OrganizationsTeamsBookingsController } from "../../../organizations/teams/bookings/organizations-teams-bookings.controller";
import { OrganizationsTeamsRepository } from "../../../organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "../../../prisma/prisma.module";
import { RedisModule } from "../../../redis/redis.module";
import { StripeModule } from "../../../stripe/stripe.module";

@Module({
  imports: [BookingsModule_2024_08_13, PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [OrganizationsTeamsBookingsController],
})
export class OrganizationsTeamsBookingsModule {}
