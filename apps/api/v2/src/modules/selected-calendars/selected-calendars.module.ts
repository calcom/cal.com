import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [SelectedCalendarsRepository],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
