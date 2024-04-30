import { vi, describe, beforeEach, it, expect } from "vitest";

import { RedisService } from "./RedisService";

vi.mock("./RedisService", () => {
  return {
    RedisService: vi.fn().mockImplementation(() => ({
      expire: vi.fn(),
      lrange: vi.fn(),
      lpush: vi.fn(),
    })),
  };
});

describe("RedisService", () => {
  let redisService;

  beforeEach(() => {
    redisService = new RedisService();
  });

  it("should call expire with correct parameters", async () => {
    const key = "testKey";
    const seconds = 3600;
    const option = "NX";
    await redisService.expire(key, seconds, option);
    expect(redisService.expire).toHaveBeenCalledWith(key, seconds, option);
  });

  it("should call lrange and return expected data", async () => {
    const key = "listKey";
    const start = 0;
    const end = -1;
    const mockResult = ["item1", "item2"];
    redisService.lrange.mockResolvedValue(mockResult);
    const result = await redisService.lrange(key, start, end);
    expect(result).toEqual(mockResult);
    expect(redisService.lrange).toHaveBeenCalledWith(key, start, end);
  });

  it("should call lpush and return the length of the list", async () => {
    const key = "listKey";
    const elements = ["item1", "item2"];
    const mockLength = 2;
    redisService.lpush.mockResolvedValue(mockLength);
    const result = await redisService.lpush(key, ...elements);
    expect(result).toBe(mockLength);
    expect(redisService.lpush).toHaveBeenCalledWith(key, ...elements);
  });
});
