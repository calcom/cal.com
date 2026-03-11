import type { NextApiRequest, NextApiResponse } from "next";

/**
 * BigBlueButton does not require an OAuth callback flow.
 * This endpoint exists to complete app scaffolding and provide a clear response
 * if someone lands here manually.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    ok: true,
    message: "BigBlueButton does not use OAuth callback flow.",
  });
}
