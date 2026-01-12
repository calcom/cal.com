import type { NextApiRequest, NextApiResponse } from "next";

import { webhookHandler } from "./utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return webhookHandler(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
