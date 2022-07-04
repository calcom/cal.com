import type { NextApiRequest, NextApiResponse } from "next";
import * as pjson from "package.json";

type Response = {
  version: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  return res.status(200).json({ version: pjson.version });
}
