import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IRedisService } from "@calcom/features/redis/IRedisService";

import { SavedQueriesService } from "../server/saved-queries-service";
import type { SavedQuery } from "../server/saved-queries-service";

// ─── Mock Redis ──────────────────────────────────────────────────────────────

function createMockRedis(): IRedisService {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(async <T>(key: string) => (store.get(key) as T) ?? null),
    set: vi.fn(async <T>(key: string, value: T) => {
      store.set(key, value);
      return "OK" as const;
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    expire: vi.fn(async () => 1 as const),
    lrange: vi.fn(async () => []),
    lpush: vi.fn(async () => 1),
    // Expose store for assertions
    _store: store,
  } as IRedisService & { _store: Map<string, unknown> };
}

const userA = { id: 1, email: "admin-a@cal.com" };
const userB = { id: 2, email: "admin-b@cal.com" };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SavedQueriesService", () => {
  let redis: ReturnType<typeof createMockRedis>;
  let service: SavedQueriesService;

  beforeEach(() => {
    redis = createMockRedis();
    service = new SavedQueriesService(redis);
  });

  // ── Save ─────────────────────────────────────────────────────────────────

  describe("save", () => {
    it("saves a private query", async () => {
      const result = await service.save(
        { name: "My Query", sql: "SELECT 1", visibility: "private" },
        userA
      );

      expect(result.name).toBe("My Query");
      expect(result.sql).toBe("SELECT 1");
      expect(result.visibility).toBe("private");
      expect(result.createdBy).toBe(userA.id);
      expect(result.createdByEmail).toBe(userA.email);
      expect(result.id).toMatch(/^sq_/);
    });

    it("saves a public query", async () => {
      const result = await service.save(
        { name: "Shared Query", sql: "SELECT 2", visibility: "public" },
        userA
      );

      expect(result.visibility).toBe("public");
    });

    it("stores private queries under user-specific key", async () => {
      await service.save(
        { name: "Q1", sql: "SELECT 1", visibility: "private" },
        userA
      );

      const { public: pub, private: priv } = await service.list(userA.id);
      expect(priv).toHaveLength(1);
      expect(pub).toHaveLength(0);
    });

    it("stores public queries under shared key", async () => {
      await service.save(
        { name: "Q1", sql: "SELECT 1", visibility: "public" },
        userA
      );

      const { public: pub, private: priv } = await service.list(userA.id);
      expect(pub).toHaveLength(1);
      expect(priv).toHaveLength(0);
    });

    it("prepends new queries (newest first)", async () => {
      await service.save({ name: "First", sql: "SELECT 1", visibility: "private" }, userA);
      await service.save({ name: "Second", sql: "SELECT 2", visibility: "private" }, userA);

      const { private: priv } = await service.list(userA.id);
      expect(priv[0].name).toBe("Second");
      expect(priv[1].name).toBe("First");
    });

    it("saves with optional description", async () => {
      const result = await service.save(
        { name: "Q", sql: "SELECT 1", description: "A useful query", visibility: "private" },
        userA
      );

      expect(result.description).toBe("A useful query");
    });
  });

  // ── List ─────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns empty arrays when no queries saved", async () => {
      const result = await service.list(userA.id);
      expect(result.public).toEqual([]);
      expect(result.private).toEqual([]);
    });

    it("returns public queries for any user", async () => {
      await service.save({ name: "Public Q", sql: "SELECT 1", visibility: "public" }, userA);

      // User B can see user A's public query
      const { public: pub } = await service.list(userB.id);
      expect(pub).toHaveLength(1);
      expect(pub[0].name).toBe("Public Q");
    });

    it("does not return other user's private queries", async () => {
      await service.save({ name: "Private A", sql: "SELECT 1", visibility: "private" }, userA);

      const { private: priv } = await service.list(userB.id);
      expect(priv).toHaveLength(0);
    });

    it("returns user's own private queries", async () => {
      await service.save({ name: "Private A", sql: "SELECT 1", visibility: "private" }, userA);

      const { private: priv } = await service.list(userA.id);
      expect(priv).toHaveLength(1);
    });

    it("returns both public and private in one call", async () => {
      await service.save({ name: "Public", sql: "SELECT 1", visibility: "public" }, userA);
      await service.save({ name: "Private", sql: "SELECT 2", visibility: "private" }, userA);

      const result = await service.list(userA.id);
      expect(result.public).toHaveLength(1);
      expect(result.private).toHaveLength(1);
    });
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes a private query", async () => {
      const saved = await service.save(
        { name: "To Delete", sql: "SELECT 1", visibility: "private" },
        userA
      );

      await service.delete(saved.id, userA.id);

      const { private: priv } = await service.list(userA.id);
      expect(priv).toHaveLength(0);
    });

    it("deletes a public query", async () => {
      const saved = await service.save(
        { name: "To Delete", sql: "SELECT 1", visibility: "public" },
        userA
      );

      await service.delete(saved.id, userA.id);

      const { public: pub } = await service.list(userA.id);
      expect(pub).toHaveLength(0);
    });

    it("rejects deleting another user's query", async () => {
      const saved = await service.save(
        { name: "A's Query", sql: "SELECT 1", visibility: "public" },
        userA
      );

      await expect(service.delete(saved.id, userB.id)).rejects.toThrow(
        "You can only delete your own queries"
      );
    });

    it("throws if query not found", async () => {
      await expect(service.delete("nonexistent", userA.id)).rejects.toThrow("Query not found");
    });

    it("only deletes the targeted query, leaving others intact", async () => {
      const q1 = await service.save({ name: "Q1", sql: "SELECT 1", visibility: "private" }, userA);
      await service.save({ name: "Q2", sql: "SELECT 2", visibility: "private" }, userA);

      await service.delete(q1.id, userA.id);

      const { private: priv } = await service.list(userA.id);
      expect(priv).toHaveLength(1);
      expect(priv[0].name).toBe("Q2");
    });
  });

  // ── Update ───────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates name and sql", async () => {
      const saved = await service.save(
        { name: "Original", sql: "SELECT 1", visibility: "private" },
        userA
      );

      // Small delay so updatedAt differs from createdAt
      await new Promise((r) => setTimeout(r, 5));

      const updated = await service.update(
        saved.id,
        { name: "Updated", sql: "SELECT 2" },
        userA
      );

      expect(updated.name).toBe("Updated");
      expect(updated.sql).toBe("SELECT 2");
      expect(updated.updatedAt).not.toBe(saved.updatedAt);
    });

    it("rejects updating another user's query", async () => {
      const saved = await service.save(
        { name: "A's Query", sql: "SELECT 1", visibility: "public" },
        userA
      );

      await expect(
        service.update(saved.id, { name: "Hacked" }, userB)
      ).rejects.toThrow("You can only edit your own queries");
    });

    it("throws if query not found", async () => {
      await expect(
        service.update("nonexistent", { name: "X" }, userA)
      ).rejects.toThrow("Query not found");
    });

    it("moves query from private to public when visibility changes", async () => {
      const saved = await service.save(
        { name: "Was Private", sql: "SELECT 1", visibility: "private" },
        userA
      );

      await service.update(saved.id, { visibility: "public" }, userA);

      const result = await service.list(userA.id);
      expect(result.private).toHaveLength(0);
      expect(result.public).toHaveLength(1);
      expect(result.public[0].name).toBe("Was Private");
      expect(result.public[0].visibility).toBe("public");
    });

    it("moves query from public to private when visibility changes", async () => {
      const saved = await service.save(
        { name: "Was Public", sql: "SELECT 1", visibility: "public" },
        userA
      );

      await service.update(saved.id, { visibility: "private" }, userA);

      const result = await service.list(userA.id);
      expect(result.public).toHaveLength(0);
      expect(result.private).toHaveLength(1);
      expect(result.private[0].visibility).toBe("private");
    });

    it("preserves unchanged fields", async () => {
      const saved = await service.save(
        { name: "Original", sql: "SELECT 1", description: "My desc", visibility: "private" },
        userA
      );

      const updated = await service.update(saved.id, { name: "New Name" }, userA);

      expect(updated.sql).toBe("SELECT 1");
      expect(updated.description).toBe("My desc");
      expect(updated.visibility).toBe("private");
    });
  });

  // ── Capacity ─────────────────────────────────────────────────────────────

  describe("capacity", () => {
    it("caps at 100 queries per list", async () => {
      // Save 101 queries
      for (let i = 0; i < 101; i++) {
        await service.save(
          { name: `Q${i}`, sql: `SELECT ${i}`, visibility: "private" },
          userA
        );
      }

      const { private: priv } = await service.list(userA.id);
      expect(priv.length).toBeLessThanOrEqual(100);
      // Newest should be first
      expect(priv[0].name).toBe("Q100");
    });
  });
});
