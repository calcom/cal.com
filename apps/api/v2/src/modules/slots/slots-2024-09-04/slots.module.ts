import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";
import { AvailableSlotsModule } from "@/lib/modules/available-slots.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController_2024_09_04 } from "@/modules/slots/slots-2024-09-04/controllers/slots.controller";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    EventTypesModule_2024_06_14,
    StripeModule,
    MembershipsModule,
    AvailableSlotsModule,
  ],
  providers: [
    SlotsRepository_2024_09_04,
    SlotsService_2024_09_04,
    UsersRepository,
    SlotsInputService_2024_09_04,
    SlotsOutputService_2024_09_04,
    TeamsEventTypesRepository,
    TeamsRepository,
  ],
  controllers: [SlotsController_2024_09_04],
  exports: [SlotsService_2024_09_04],
})
export class SlotsModule_2024_09_04 {}
