export function ensureNoServiceAccountKey<T extends { id: number; defaultServiceAccountKey?: unknown }>(
  workspacePlatform: T
) {
  const { defaultServiceAccountKey: _1, ...rest } = workspacePlatform;
  return {
    ...rest,
    defaultServiceAccountKey: undefined,
  };
}
