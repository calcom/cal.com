export interface IRedisService {
  get: <TData>(key: string) => Promise<TData | null>;

  set: <TData>(key: string, value: TData) => Promise<"OK" | TData | null>;

  expire: (
    key: string,
    seconds: number,
    option?: ("NX" | "nx" | "XX" | "xx" | "GT" | "gt" | "LT" | "lt") | undefined
  ) => Promise<0 | 1>;

  lrange: <TResult = string>(key: string, start: number, end: number) => Promise<TResult[]>;

  lpush: <TData>(key: string, ...elements: TData[]) => Promise<number>;
}
