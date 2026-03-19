import type { KVAdapter } from "./KVAdapter";

export class NoOpKVAdapter implements KVAdapter {
  async get(_key: string): Promise<string | null> {
    return null;
  }

  async put(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {}

  async delete(_key: string): Promise<void> {}
}
