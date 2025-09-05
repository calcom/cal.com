import { getOptions } from "@calcom/features/auth/lib/next-auth-options";
import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(req, res, getOptions({ getDubId: () => req.cookies.dub_id || req.cookies.dclid }));

export default handler;
