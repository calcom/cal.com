import { middleware } from "../trpc";

const perfMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const start = performance.now();
  performance.mark("Start");
  const result = await next();
  const end = performance.now();
  // Except the `createContext` timing all timings are included in this timing that happens for the route.
  // So, total timing becomes createContext + t.
  // Note that there is still some time that is taken before `createContext` is called and that time isn't reflected in that
  // addServerTimingHeaderIfRes({
  //   res: ctx.res,
  //   timings: [
  //     {
  //       label: "t",
  //       duration: end - start,
  //     },
  //   ],
  // });
  performance.mark("End");
  performance.measure(`[${result.ok ? "OK" : "ERROR"}][$1] ${type} '${path}'`, "Start", "End");
  console.log("perfMiddleware end", performance.now());
  return result;
});

export default perfMiddleware;
