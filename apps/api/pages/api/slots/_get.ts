import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { getScheduleSchema } from "@calcom/trpc/server/routers/viewer/slots/types";
import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const input = getScheduleSchema.parse(req.query);
    return await getAvailableSlots({ ctx: await createContext({ req, res }), input });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(cause);
      throw new HttpError({ statusCode, message: cause.message });
    }
    throw cause;
  }
}

export default defaultResponder(handler);
