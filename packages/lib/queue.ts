import { verifySignature } from "@upstash/qstash/dist/nextjs";
import type { VerifySignatureConfig } from "@upstash/qstash/dist/nextjs";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

export function verifySignatureIfQStash(
  handler: NextApiHandler,
  config?: VerifySignatureConfig
): NextApiHandler {
  const justParseBody = async (req: NextApiRequest, res: NextApiResponse) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks).toString("utf-8");

    try {
      if (req.headers["content-type"] === "application/json") {
        req.body = JSON.parse(body);
      } else {
        req.body = body;
      }
    } catch {
      req.body = body;
    }

    return handler(req, res);
  };

  if (process.env.QSTASH_URL === "localhost") {
    return justParseBody;
  } else {
    return verifySignature(handler, config);
  }
}
