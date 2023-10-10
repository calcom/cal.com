import { appRouter } from "@calcom/trpc/server/routers/_app";

import { type FetchCreateContextFnOptions, fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (request: Request) => {
  console.log(`incoming request ${request.url}`);
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: function (opts: FetchCreateContextFnOptions): object | Promise<object> {
      const { req, resHeaders } = opts;
      return { req, resHeaders };
    },
  });
};

export { handler as GET, handler as POST };
