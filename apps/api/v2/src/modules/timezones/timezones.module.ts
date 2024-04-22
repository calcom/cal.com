import { TimezonesController } from "@/modules/timezones/controllers/timezones.controller";
import { TimezonesService } from "@/modules/timezones/services/timezones.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [TimezonesService],
  controllers: [TimezonesController],
  exports: [TimezonesService],
})
export class TimezoneModule {}
