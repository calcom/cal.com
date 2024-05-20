import { RedisModule } from "@/modules/redis/redis.module";
import { TimezonesController as TimezonesController20240521 } from "@/modules/timezones/controllers/2024-05-21/timezones.controller";
import { TimezonesController } from "@/modules/timezones/controllers/timezones.controller";
import { TimezonesService } from "@/modules/timezones/services/timezones.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [RedisModule],
  providers: [TimezonesService],
  controllers: [TimezonesController, TimezonesController20240521],
  exports: [TimezonesService],
})
export class TimezoneModule {}
