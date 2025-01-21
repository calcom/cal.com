import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsController_2024_09_04 } from "@/modules/slots/slots-2024-09-04/controllers/slots.controller";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slot-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14],
  providers: [
    SlotsRepository_2024_09_04,
    SlotsService_2024_09_04,
    UsersRepository,
    SlotsInputService_2024_09_04,
    SlotsOutputService_2024_09_04,
  ],
  controllers: [SlotsController_2024_09_04],
  exports: [SlotsService_2024_09_04],
})
export class SlotsModule_2024_09_04 {}
