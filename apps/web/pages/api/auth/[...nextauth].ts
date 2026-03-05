import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

import { getOptions } from "@calcom/features/auth/lib/next-auth-options";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(
    req,
    res,
    getOptions({
      cookies: {
        utm_params: req.cookies.utm_params,
        device_details: req.cookies.device_details,
        dub_id: req.cookies.dub_id || req.cookies.dclid,
        last_active_throttle: req.cookies.last_active_throttle,
        pipedrive_oauth_code: req.cookies.pipedrive_oauth_code,
      },
      res,
      req,
    })
  );

export default handler;
