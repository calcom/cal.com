export function getSafe<T>(obj: unknown, path: (string | number)[]): T | undefined {
  return path.reduce(
    (acc, key) => (typeof acc === "object" && acc !== null ? (acc as any)[key] : undefined),
    obj
  ) as T | undefined;
}
