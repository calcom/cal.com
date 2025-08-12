import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { AvailableSlotsModule } from "@/lib/modules/available-slots.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/users/index/organizations-users.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController_2024_09_04 } from "@/modules/slots/slots-2024-09-04/controllers/slots.controller";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    EventTypesModule_2024_06_14,
    StripeModule,
    TeamsModule,
    MembershipsModule,
    TeamsEventTypesModule,
    AvailableSlotsModule,
  ],
  providers: [
    SlotsRepository_2024_09_04,
    SlotsService_2024_09_04,
    UsersRepository,
    SlotsInputService_2024_09_04,
    SlotsOutputService_2024_09_04,
    OrganizationsUsersRepository,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
  ],
  controllers: [SlotsController_2024_09_04],
  exports: [SlotsService_2024_09_04],
})
export class SlotsModule_2024_09_04 {}
