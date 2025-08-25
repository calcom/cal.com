export function createCachedImport<T>(importFunc: () => Promise<T>): () => Promise<T> {
  let cachedModule: T | undefined;

  return async () => {
    if (!cachedModule) {
      cachedModule = await importFunc();
    }
    return cachedModule;
  };
}
