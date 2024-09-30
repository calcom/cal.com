import { Module } from "@nestjs/common";

import { TimezonesController } from "../timezones/controllers/timezones.controller";
import { TimezonesService } from "../timezones/services/timezones.service";

@Module({
  imports: [],
  providers: [TimezonesService],
  controllers: [TimezonesController],
  exports: [TimezonesService],
})
export class TimezoneModule {}
