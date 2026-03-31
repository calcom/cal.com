export interface KVAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
