import { Module } from "@nestjs/common";
import { RedisService } from "src/modules/redis/redis.service";

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
