import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { z } from "zod";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, method } = req;

  const id = z.string().safeParse(query?.id);

  switch (method) {
    case "GET":
      if (id.success) {
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        const hmac = crypto.createHmac("sha256", process.env.INTERCOM_SECRET ?? "");
        hmac.update(id.data);
        const hash = hmac.digest("hex");

        res.status(200).json({ hash });
      } else {
        res.status(404).json({ message: "user id is required" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
