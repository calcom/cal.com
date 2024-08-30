import { Module } from "@nestjs/common";
import { RedisModule } from "src/modules/redis/redis.module";
import { TimezonesController } from "src/modules/timezones/controllers/timezones.controller";
import { TimezonesService } from "src/modules/timezones/services/timezones.service";

@Module({
  imports: [RedisModule],
  providers: [TimezonesService],
  controllers: [TimezonesController],
  exports: [TimezonesService],
})
export class TimezoneModule {}
