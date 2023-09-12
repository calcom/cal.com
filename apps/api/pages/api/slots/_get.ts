import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  /** @see https://trpc.io/docs/server-side-calls */
  const ctx = await createContext({ req, res });
  const caller = viewerRouter.createCaller(ctx);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await caller.slots.getSchedule(req.query as any /* Let tRPC handle this */);
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(cause);
      throw new HttpError({ statusCode, message: cause.message });
    }
    throw cause;
  }
}

export default defaultResponder(handler);
