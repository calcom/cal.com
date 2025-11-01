import { PerformanceObserver } from "perf_hooks";

import logger from "../logger";

declare global {
   
  var perfObserver: PerformanceObserver | undefined;
}
export const perfObserver =
  globalThis.perfObserver ||
  new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      // Log entry duration in seconds with four decimal places.
      logger.debug(entry.name.replace("$1", `${(entry.duration / 1000.0).toFixed(4)}s`));
    });
  });

perfObserver.observe({ entryTypes: ["measure"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.perfObserver = perfObserver;
}

export default perfObserver;

export { performance } from "perf_hooks";
