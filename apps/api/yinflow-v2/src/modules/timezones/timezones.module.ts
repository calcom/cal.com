import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";
import { TimezonesController } from "../timezones/controllers/timezones.controller";
import { TimezonesService } from "../timezones/services/timezones.service";

@Module({
  imports: [RedisModule],
  providers: [TimezonesService],
  controllers: [TimezonesController],
  exports: [TimezonesService],
})
export class TimezoneModule {}
