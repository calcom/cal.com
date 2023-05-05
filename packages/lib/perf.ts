export const logP = (message: string) => {
  const start = performance.now();

  return () => {
    const end = performance.now();
    console.log(`[PERF]: ${message} took ${end - start}ms`);
  };
};
