import { AttendeesRepository_2024_09_04 } from "@/ee/attendees/2024-09-04/attendees.repository";
import { AttendeesController_2024_09_04 } from "@/ee/attendees/2024-09-04/controllers/attendees.controller";
import { AttendeesService_2024_09_04 } from "@/ee/attendees/2024-09-04/services/attendees.service";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule, BookingsModule_2024_08_13],
  providers: [AttendeesService_2024_09_04, AttendeesRepository_2024_09_04],
  controllers: [AttendeesController_2024_09_04],
  exports: [AttendeesService_2024_09_04, AttendeesRepository_2024_09_04],
})
export class AttendeesModule_2024_09_04 {}
