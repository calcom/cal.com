import { RedisService } from "@/modules/redis/redis.service";
import { Provider } from "@nestjs/common";

export const MockedRedisService = {
  provide: RedisService,
  useValue: {
    redis: {
      get: jest.fn(),
      hgetall: jest.fn(),
      set: jest.fn(),
      hmset: jest.fn(),
      expireat: jest.fn(),
    },
  },
} as Provider;
