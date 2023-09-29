import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  console.log("postHandler", req);
  // TODO:
  // 1. validate request
  // 2. Invalidate current cache
  // 3. Refresh cache with longer timeout
  res.status(200).json({ message: "ok" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
