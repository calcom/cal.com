import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

import { createContext } from "@server/createContext";
import { viewerRouter } from "@server/routers/viewer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  /** So we can reuse tRCP queries */
  const trpcCtx = await createContext({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method === "POST") {
    const eventType = await viewerRouter.createCaller(trpcCtx).mutation("eventTypes.create", req.body);
    res.status(201).json({ eventType });
  }

  if (req.method === "PATCH") {
    const eventType = await viewerRouter.createCaller(trpcCtx).mutation("eventTypes.update", req.body);
    res.status(201).json({ eventType });
  }

  if (req.method === "DELETE") {
    await viewerRouter.createCaller(trpcCtx).mutation("eventTypes.delete", { id: req.body.id });
    res.status(200).json({ id: req.body.id, message: "Event Type deleted" });
  }
}
