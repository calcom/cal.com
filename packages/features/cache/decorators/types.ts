const DEFAULT_TTL_MS: number = 5 * 60 * 1000; // 5 minutes

interface IRedisService {
  get: <TData>(key: string) => Promise<TData | null>;
  set: <TData>(key: string, value: TData, opts?: { ttl?: number }) => Promise<"OK" | TData | null>;
  del: (key: string) => Promise<number>;
}

let _redisService: IRedisService | null = null;

function setRedisService(redis: IRedisService): void {
  _redisService = redis;
}

function getRedisService(): IRedisService {
  if (!_redisService) {
    throw new Error("Redis service not initialized. Call setRedisService() during app initialization.");
  }
  return _redisService;
}

export { DEFAULT_TTL_MS, setRedisService, getRedisService };
export type { IRedisService };
