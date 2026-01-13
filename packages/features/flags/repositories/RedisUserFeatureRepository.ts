import type { IRedisService } from "../../redis/IRedisService";
import type { FeatureId, FeatureState } from "../config";

const CACHE_PREFIX = "features:user";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface IRedisUserFeatureRepository {
  findByUserIdAndFeatureId(userId: number, featureId: string): Promise<boolean | null>;
  setByUserIdAndFeatureId(
    userId: number,
    featureId: string,
    enabled: boolean,
    ttlMs?: number
  ): Promise<void>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>> | null>;
  setByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[],
    data: Partial<Record<FeatureId, FeatureState>>,
    ttlMs?: number
  ): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean | null>;
  setAutoOptInByUserId(userId: number, enabled: boolean, ttlMs?: number): Promise<void>;
  invalidateByUserId(userId: number): Promise<void>;
  invalidateAutoOptIn(userId: number): Promise<void>;
}

export class RedisUserFeatureRepository implements IRedisUserFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  private getByUserIdAndFeatureIdKey(userId: number, featureId: string): string {
    return `${CACHE_PREFIX}:${userId}:${featureId}`;
  }

  private getByUserIdAndFeatureIdsKey(userId: number, featureIds: FeatureId[]): string {
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${CACHE_PREFIX}:batch:${userId}:${sortedFeatureIds}`;
  }

  private getAutoOptInKey(userId: number): string {
    return `${CACHE_PREFIX}:autoOptIn:${userId}`;
  }

  async findByUserIdAndFeatureId(userId: number, featureId: string): Promise<boolean | null> {
    return this.redisService.get<boolean>(this.getByUserIdAndFeatureIdKey(userId, featureId));
  }

  async setByUserIdAndFeatureId(
    userId: number,
    featureId: string,
    enabled: boolean,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(this.getByUserIdAndFeatureIdKey(userId, featureId), enabled, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>> | null> {
    return this.redisService.get<Partial<Record<FeatureId, FeatureState>>>(
      this.getByUserIdAndFeatureIdsKey(userId, featureIds)
    );
  }

  async setByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[],
    data: Partial<Record<FeatureId, FeatureState>>,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(this.getByUserIdAndFeatureIdsKey(userId, featureIds), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findAutoOptInByUserId(userId: number): Promise<boolean | null> {
    return this.redisService.get<boolean>(this.getAutoOptInKey(userId));
  }

  async setAutoOptInByUserId(userId: number, enabled: boolean, ttlMs?: number): Promise<void> {
    await this.redisService.set(this.getAutoOptInKey(userId), enabled, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateByUserId(userId: number): Promise<void> {
    await this.redisService.del(this.getAutoOptInKey(userId));
  }

  async invalidateAutoOptIn(userId: number): Promise<void> {
    await this.redisService.del(this.getAutoOptInKey(userId));
  }
}
