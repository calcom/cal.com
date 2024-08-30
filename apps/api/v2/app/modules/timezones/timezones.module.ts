import { Module } from "@nestjs/common";
import { RedisModule } from "app/modules/redis/redis.module";
import { TimezonesController } from "app/modules/timezones/controllers/timezones.controller";
import { TimezonesService } from "app/modules/timezones/services/timezones.service";

@Module({
  imports: [RedisModule],
  providers: [TimezonesService],
  controllers: [TimezonesController],
  exports: [TimezonesService],
})
export class TimezoneModule {}
