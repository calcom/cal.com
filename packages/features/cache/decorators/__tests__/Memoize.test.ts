import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memoize } from "../Memoize";
import { DEFAULT_TTL_MS } from "../types";

const createMockRedis = (): IRedisService => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  lpush: vi.fn(),
});

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

describe("Memoize decorator", () => {
  beforeEach(() => {
    mockRedis = createMockRedis();
    vi.clearAllMocks();
  });

  it("should return cached value on cache hit", async () => {
    const cachedValue = { id: 1, name: "test" };
    vi.mocked(mockRedis.get).mockResolvedValue(cachedValue);

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}` })
      async findById(id: number): Promise<{ id: number; name: string } | null> {
        return { id, name: "from-db" };
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toEqual(cachedValue);
    expect(mockRedis.get).toHaveBeenCalledWith("test:1");
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it("should fetch from source and cache on cache miss", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);
    vi.mocked(mockRedis.set).mockResolvedValue("OK");

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}` })
      async findById(id: number): Promise<{ id: number; name: string } | null> {
        return { id, name: "from-db" };
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toEqual({ id: 1, name: "from-db" });
    expect(mockRedis.get).toHaveBeenCalledWith("test:1");
    expect(mockRedis.set).toHaveBeenCalledWith("test:1", { id: 1, name: "from-db" }, { ttl: DEFAULT_TTL_MS });
  });

  it("should use custom TTL when provided", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);
    vi.mocked(mockRedis.set).mockResolvedValue("OK");

    const customTtl = 10000;

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}`, ttl: customTtl })
      async findById(id: number): Promise<{ id: number; name: string } | null> {
        return { id, name: "from-db" };
      }
    }

    const repo = new TestRepository();
    await repo.findById(1);

    expect(mockRedis.set).toHaveBeenCalledWith("test:1", { id: 1, name: "from-db" }, { ttl: customTtl });
  });

  it("should not cache null results", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}` })
      async findById(_id: number): Promise<{ id: number; name: string } | null> {
        return null;
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toBeNull();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it("should validate cached data with Zod schema", async () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });

    const validCachedValue = { id: 1, name: "test" };
    vi.mocked(mockRedis.get).mockResolvedValue(validCachedValue);

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}`, schema })
      async findById(id: number): Promise<{ id: number; name: string } | null> {
        return { id, name: "from-db" };
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toEqual(validCachedValue);
  });

  it("should fetch from source when cached data fails Zod validation", async () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });

    const invalidCachedValue = { id: "not-a-number", name: 123 };
    vi.mocked(mockRedis.get).mockResolvedValue(invalidCachedValue);
    vi.mocked(mockRedis.set).mockResolvedValue("OK");

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}`, schema })
      async findById(id: number): Promise<{ id: number; name: string } | null> {
        return { id, name: "from-db" };
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toEqual({ id: 1, name: "from-db" });
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it("should generate correct cache key with multiple arguments", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);
    vi.mocked(mockRedis.set).mockResolvedValue("OK");

    class TestRepository {
      @Memoize({ key: (userId: number, featureId: string) => `features:user:${userId}:${featureId}` })
      async findByUserIdAndFeatureId(
        userId: number,
        featureId: string
      ): Promise<{ userId: number; featureId: string } | null> {
        return { userId, featureId };
      }
    }

    const repo = new TestRepository();
    await repo.findByUserIdAndFeatureId(123, "feature-abc");

    expect(mockRedis.get).toHaveBeenCalledWith("features:user:123:feature-abc");
  });

  it("should preserve method context (this binding)", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);
    vi.mocked(mockRedis.set).mockResolvedValue("OK");

    class TestRepository {
      prefix = "custom";

      @Memoize({ key: (id: number) => `test:${id}` })
      async findById(id: number): Promise<string> {
        return `${this.prefix}-${id}`;
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toBe("custom-1");
  });

  it("should not cache undefined results", async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null);

    class TestRepository {
      @Memoize({ key: (id: number) => `test:${id}` })
      async findById(_id: number): Promise<{ id: number } | undefined> {
        return undefined;
      }
    }

    const repo = new TestRepository();
    const result = await repo.findById(1);

    expect(result).toBeUndefined();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
