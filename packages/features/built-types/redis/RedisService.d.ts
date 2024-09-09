import type { IRedisService } from "./IRedisService";
export declare class RedisService implements IRedisService {
    private redis;
    constructor();
    get<TData>(key: string): Promise<TData | null>;
    set<TData>(key: string, value: TData): Promise<"OK" | TData | null>;
    expire(key: string, seconds: number): Promise<0 | 1>;
    lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]>;
    lpush<TData>(key: string, ...elements: TData[]): Promise<number>;
}
//# sourceMappingURL=RedisService.d.ts.map