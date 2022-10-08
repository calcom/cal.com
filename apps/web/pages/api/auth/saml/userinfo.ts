import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";

import { HttpError } from "@lib/core/http/error";

const extractAuthToken = (req: NextApiRequest) => {
  const authHeader = req.headers["authorization"];
  const parts = (authHeader || "").split(" ");

  if (parts.length > 1) {
    return parts[1];
  }

  return null;
};

const requestQuery = z.object({
  access_token: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();

  if (req.method !== "GET") {
    return res.status(400).json({ message: "Method not allowed" });
  }

  let token: string | null = extractAuthToken(req);

  // check for query param
  if (!token) {
    let arr: string[] = [];

    const { access_token } = requestQuery.parse(req.query);

    arr = arr.concat(access_token);

    if (arr[0].length > 0) {
      token = arr[0];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile = await oauthController.userInfo(token);

    return res.json(profile);
  } catch (err) {
    const { message, statusCode = 500 } = err as HttpError;

    return res.status(statusCode).json({ message });
  }
}
