import logger from "./logger";

export const logP = (message: string) => {
  const start = performance.now();

  return () => {
    const end = performance.now();
    logger.debug(`[PERF]: ${message} took ${end - start}ms`);
  };
};
