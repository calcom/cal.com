import { RedisService } from "@/modules/redis/redis.service";
import { Provider } from "@nestjs/common";

export const MockedRedisService = {
  provide: RedisService,
  useValue: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    hgetall: jest.fn(),
    hmset: jest.fn(),
    expireat: jest.fn(),
  },
} as Provider;
