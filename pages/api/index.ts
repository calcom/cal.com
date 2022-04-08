import type { NextApiRequest, NextApiResponse } from "next";

export default async function CalcomApi(req: NextApiRequest, res: NextApiResponse) {
  res.status(201).json({ message: "Welcome to Cal.com API - docs are at https://docs.cal.com/api" });
}
