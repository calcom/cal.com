import { Provider } from "@nestjs/common";
import { RedisService } from "@/modules/redis/redis.service";

export const MockedRedisService = {
  provide: RedisService,
  useValue: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getKeys: jest.fn(),
    delMany: jest.fn(),
    expire: jest.fn(),
    lrange: jest.fn(),
    lpush: jest.fn(),
    incr: jest.fn(),
    hmset: jest.fn(),
    hgetall: jest.fn(),
    expireat: jest.fn(),
  },
} as Provider;
