import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [SelectedCalendarsRepository],
  exports: [SelectedCalendarsRepository],
})
export class CredentialsModule {}
