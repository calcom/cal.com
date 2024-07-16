import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [SelectedCalendarsRepository],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
