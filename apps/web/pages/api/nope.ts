import type { NextApiRequest, NextApiResponse } from "next";

type Response = {
  message: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  console.log("REQ_NOPE", req.body);
  console.log("REQ_NOPE_2", req);
  return res.status(200).json({ message: "Please don't" });
}
