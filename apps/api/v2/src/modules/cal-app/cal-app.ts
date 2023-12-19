import { CalAppRepository } from "@/modules/cal-app/cal-app.repository";
import { GoogleCalendarController } from "@/modules/cal-app/controllers/gcal.controller";
import { CredentialRepository } from "@/modules/credential/credential.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [CredentialRepository],
  providers: [CalAppRepository],
  controllers: [GoogleCalendarController],
  exports: [],
})
export class CalAppModule {}
