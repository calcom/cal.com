import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { publicViewerRouter } from "@calcom/trpc/server/routers/publicViewer/_router";

const nextApiHandler = createNextApiHandler(publicViewerRouter, true);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow-Origin has to be set to the requesting domain that you want to send the credentials back to
  res.setHeader("Access-Control-Allow-Origin", WEBAPP_URL);
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }
  // finally pass the request on to the tRPC handler
  return nextApiHandler(req, res);
}
