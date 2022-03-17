import type { NextApiResponse } from "next";

// @TODO: move to packages/lib so it can be used on web/website
import usernameHandler, { RequestWithUsernameStatus } from "../../../../website/lib/username";

type Response = {
  available: boolean;
  premium: boolean;
};

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse<Response>): Promise<void> {
  return res.status(req.usernameStatus.statusCode).json(req.usernameStatus.json);
}

export default usernameHandler(handler);
