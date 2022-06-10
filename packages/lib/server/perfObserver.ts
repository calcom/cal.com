import { PerformanceObserver } from "perf_hooks";

declare global {
  // eslint-disable-next-line no-var
  var perfObserver: PerformanceObserver | undefined;
}

export const perfObserver =
  globalThis.perfObserver ||
  new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      console.log(entry); // fake call to our custom logging solution
    });
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.perfObserver = perfObserver;
}

export default perfObserver;
