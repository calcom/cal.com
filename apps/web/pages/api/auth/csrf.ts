import type { NextApiRequest, NextApiResponse } from "next";

import { setCsrfToken } from "@calcom/features/auth/lib/set-csrf-token";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("✨ Getting CSRF token...");
  if (req.method === "GET") {
    setCsrfToken(res);
    res.status(200).json({ message: "OK!" });
    res.end();
  } else {
    // Handle any other HTTP method
    return res.status(501);
  }
}
