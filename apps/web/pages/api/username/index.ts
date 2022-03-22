import type { NextApiResponse } from "next";

import usernameHandler, { RequestWithUsernameStatus } from "@calcom/lib/username";

type Response = {
  available: boolean;
  premium: boolean;
};

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse<Response>): Promise<void> {
  return res.status(req.usernameStatus.statusCode).json(req.usernameStatus.json);
}

export default usernameHandler(handler);
