import { NextApiRequest, NextApiResponse } from "next";

import jackson from "@lib/jackson";

const extractAuthToken = (req: NextApiRequest) => {
  const authHeader = req.headers["authorization"];
  const parts = (authHeader || "").split(" ");
  if (parts.length > 1) {
    return parts[1];
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      throw new Error("Method not allowed");
    }

    const { oauthController } = await jackson();
    let token: string | null = extractAuthToken(req);

    // check for query param
    if (!token) {
      let arr: string[] = [];
      arr = arr.concat(req.query.access_token);
      if (arr[0].length > 0) {
        token = arr[0];
      }
    }

    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await oauthController.userInfo(token);

    res.json(profile);
  } catch (err: any) {
    console.error("userinfo error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).json({ message });
  }
}
