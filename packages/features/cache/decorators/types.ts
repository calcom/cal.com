export const DEFAULT_TTL_MS: number = 5 * 60 * 1000; // 5 minutes

export interface IRedisService {
  get: <TData>(key: string) => Promise<TData | null>;
  set: <TData>(key: string, value: TData, opts?: { ttl?: number }) => Promise<"OK" | TData | null>;
  del: (key: string) => Promise<number>;
}

export interface WithRedis {
  redis: IRedisService;
}
