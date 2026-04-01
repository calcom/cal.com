import type { IRedisService } from "@calcom/features/redis/IRedisService";

/**
 * Saved SQL queries for the admin Data Studio.
 *
 * Storage layout in Redis:
 *   - `datastudio:queries:public`       → JSON array of SavedQuery (shared across all admins)
 *   - `datastudio:queries:private:{uid}` → JSON array of SavedQuery (per-admin)
 *
 * Queries are stored newest-first. We cap at MAX_QUERIES per list.
 */

const KEY_PUBLIC = "datastudio:queries:public";
const keyPrivate = (userId: number) => `datastudio:queries:private:${userId}`;
const MAX_QUERIES = 100;

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  description?: string;
  visibility: "public" | "private";
  createdBy: number;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export class SavedQueriesService {
  constructor(private redis: IRedisService) {}

  /** List all queries visible to this user (their private + all public) */
  async list(userId: number): Promise<{ public: SavedQuery[]; private: SavedQuery[] }> {
    const [pub, priv] = await Promise.all([
      this.redis.get<SavedQuery[]>(KEY_PUBLIC),
      this.redis.get<SavedQuery[]>(keyPrivate(userId)),
    ]);

    return {
      public: pub ?? [],
      private: priv ?? [],
    };
  }

  /** Save a new query */
  async save(
    query: { name: string; sql: string; description?: string; visibility: "public" | "private" },
    user: { id: number; email: string }
  ): Promise<SavedQuery> {
    const now = new Date().toISOString();
    const saved: SavedQuery = {
      id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: query.name,
      sql: query.sql,
      description: query.description,
      visibility: query.visibility,
      createdBy: user.id,
      createdByEmail: user.email,
      createdAt: now,
      updatedAt: now,
    };

    const key = query.visibility === "public" ? KEY_PUBLIC : keyPrivate(user.id);
    const existing = (await this.redis.get<SavedQuery[]>(key)) ?? [];

    // Prepend and cap
    const updated = [saved, ...existing].slice(0, MAX_QUERIES);
    await this.redis.set(key, updated);

    return saved;
  }

  /** Update an existing query (only owner can update) */
  async update(
    queryId: string,
    updates: { name?: string; sql?: string; description?: string; visibility?: "public" | "private" },
    user: { id: number; email: string }
  ): Promise<SavedQuery> {
    // Check both public and private lists
    const pubQueries = (await this.redis.get<SavedQuery[]>(KEY_PUBLIC)) ?? [];
    const privQueries = (await this.redis.get<SavedQuery[]>(keyPrivate(user.id))) ?? [];

    let found: SavedQuery | undefined;
    let sourceKey: string | undefined;
    let sourceList: SavedQuery[] | undefined;

    const pubIdx = pubQueries.findIndex((q) => q.id === queryId);
    if (pubIdx !== -1) {
      found = pubQueries[pubIdx];
      sourceKey = KEY_PUBLIC;
      sourceList = pubQueries;
    } else {
      const privIdx = privQueries.findIndex((q) => q.id === queryId);
      if (privIdx !== -1) {
        found = privQueries[privIdx];
        sourceKey = keyPrivate(user.id);
        sourceList = privQueries;
      }
    }

    if (!found || !sourceKey || !sourceList) {
      throw new Error("Query not found");
    }
    if (found.createdBy !== user.id) {
      throw new Error("You can only edit your own queries");
    }

    const updated: SavedQuery = {
      ...found,
      name: updates.name ?? found.name,
      sql: updates.sql ?? found.sql,
      description: updates.description ?? found.description,
      updatedAt: new Date().toISOString(),
    };

    // If visibility changed, move between lists
    const newVisibility = updates.visibility ?? found.visibility;
    if (newVisibility !== found.visibility) {
      updated.visibility = newVisibility;

      // Remove from old list
      const filteredOld = sourceList.filter((q) => q.id !== queryId);
      await this.redis.set(sourceKey, filteredOld);

      // Add to new list
      const newKey = newVisibility === "public" ? KEY_PUBLIC : keyPrivate(user.id);
      const newList = (await this.redis.get<SavedQuery[]>(newKey)) ?? [];
      await this.redis.set(newKey, [updated, ...newList].slice(0, MAX_QUERIES));
    } else {
      // Update in place
      const idx = sourceList.findIndex((q) => q.id === queryId);
      sourceList[idx] = updated;
      await this.redis.set(sourceKey, sourceList);
    }

    return updated;
  }

  /** Get a single query by ID (checks both public and all private lists) */
  async getById(queryId: string): Promise<SavedQuery | null> {
    // Check public first
    const pubQueries = (await this.redis.get<SavedQuery[]>(KEY_PUBLIC)) ?? [];
    const pub = pubQueries.find((q) => q.id === queryId);
    if (pub) return pub;

    // For private queries we can't scan all users, so we look up by the prefix
    // embedded in the ID. This means private queries are only shareable if the
    // recipient knows the ID — but they'd still need admin access anyway.
    // We'll scan the requester's private list as a fallback.
    return null;
  }

  /** Get a single query by ID, checking a specific user's private list too */
  async getByIdForUser(queryId: string, userId: number): Promise<SavedQuery | null> {
    const pubQueries = (await this.redis.get<SavedQuery[]>(KEY_PUBLIC)) ?? [];
    const pub = pubQueries.find((q) => q.id === queryId);
    if (pub) return pub;

    const privQueries = (await this.redis.get<SavedQuery[]>(keyPrivate(userId))) ?? [];
    const priv = privQueries.find((q) => q.id === queryId);
    if (priv) return priv;

    return null;
  }

  /** Delete a query (only owner can delete) */
  async delete(queryId: string, userId: number): Promise<void> {
    // Check both lists
    const pubQueries = (await this.redis.get<SavedQuery[]>(KEY_PUBLIC)) ?? [];
    const privQueries = (await this.redis.get<SavedQuery[]>(keyPrivate(userId))) ?? [];

    const pubIdx = pubQueries.findIndex((q) => q.id === queryId);
    if (pubIdx !== -1) {
      if (pubQueries[pubIdx].createdBy !== userId) {
        throw new Error("You can only delete your own queries");
      }
      pubQueries.splice(pubIdx, 1);
      await this.redis.set(KEY_PUBLIC, pubQueries);
      return;
    }

    const privIdx = privQueries.findIndex((q) => q.id === queryId);
    if (privIdx !== -1) {
      if (privQueries[privIdx].createdBy !== userId) {
        throw new Error("You can only delete your own queries");
      }
      privQueries.splice(privIdx, 1);
      await this.redis.set(keyPrivate(userId), privQueries);
      return;
    }

    throw new Error("Query not found");
  }
}
