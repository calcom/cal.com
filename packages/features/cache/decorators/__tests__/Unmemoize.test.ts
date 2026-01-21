import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Unmemoize } from "../Unmemoize";

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

describe("Unmemoize decorator", () => {
  beforeEach(() => {
    mockRedis = createMockRedis();
    vi.clearAllMocks();
  });

  it("should invalidate cache keys after method execution", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async delete(_id: number): Promise<void> {
        return;
      }
    }

    const repo = new TestRepository();
    await repo.delete(1);

    expect(mockRedis.del).toHaveBeenCalledWith("test:1");
  });

  it("should invalidate multiple cache keys", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`, `test:all`, `test:list:${id}`] })
      async delete(_id: number): Promise<void> {
        return;
      }
    }

    const repo = new TestRepository();
    await repo.delete(1);

    expect(mockRedis.del).toHaveBeenCalledTimes(3);
    expect(mockRedis.del).toHaveBeenCalledWith("test:1");
    expect(mockRedis.del).toHaveBeenCalledWith("test:all");
    expect(mockRedis.del).toHaveBeenCalledWith("test:list:1");
  });

  it("should return the method result correctly", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async update(id: number): Promise<{ id: number; updated: boolean }> {
        return { id, updated: true };
      }
    }

    const repo = new TestRepository();
    const result = await repo.update(1);

    expect(result).toEqual({ id: 1, updated: true });
  });

  it("should generate correct cache keys with multiple arguments", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({
        keys: (userId: number, featureId: string) => [`features:user:${userId}:${featureId}`],
      })
      async upsert(userId: number, featureId: string): Promise<{ userId: number; featureId: string }> {
        return { userId, featureId };
      }
    }

    const repo = new TestRepository();
    await repo.upsert(123, "feature-abc");

    expect(mockRedis.del).toHaveBeenCalledWith("features:user:123:feature-abc");
  });

  it("should preserve method context (this binding)", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      prefix = "custom";

      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async update(id: number): Promise<string> {
        return `${this.prefix}-${id}`;
      }
    }

    const repo = new TestRepository();
    const result = await repo.update(1);

    expect(result).toBe("custom-1");
  });

  it("should invalidate cache even when method returns null", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async delete(_id: number): Promise<null> {
        return null;
      }
    }

    const repo = new TestRepository();
    const result = await repo.delete(1);

    expect(result).toBeNull();
    expect(mockRedis.del).toHaveBeenCalledWith("test:1");
  });

  it("should invalidate cache even when method returns undefined", async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1);

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async delete(_id: number): Promise<void> {
        return undefined;
      }
    }

    const repo = new TestRepository();
    await repo.delete(1);

    expect(mockRedis.del).toHaveBeenCalledWith("test:1");
  });

  it("should execute method before invalidating cache", async () => {
    const executionOrder: string[] = [];

    vi.mocked(mockRedis.del).mockImplementation(async () => {
      executionOrder.push("cache-invalidated");
      return 1;
    });

    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async update(id: number): Promise<{ id: number }> {
        executionOrder.push("method-executed");
        return { id };
      }
    }

    const repo = new TestRepository();
    await repo.update(1);

    expect(executionOrder).toEqual(["method-executed", "cache-invalidated"]);
  });

  it("should handle empty keys array", async () => {
    class TestRepository {
      @Unmemoize({ keys: () => [] })
      async update(id: number): Promise<{ id: number }> {
        return { id };
      }
    }

    const repo = new TestRepository();
    const result = await repo.update(1);

    expect(result).toEqual({ id: 1 });
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("should propagate errors from the original method", async () => {
    class TestRepository {
      @Unmemoize({ keys: (id: number) => [`test:${id}`] })
      async update(_id: number): Promise<{ id: number }> {
        throw new Error("Database error");
      }
    }

    const repo = new TestRepository();

    await expect(repo.update(1)).rejects.toThrow("Database error");
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});
