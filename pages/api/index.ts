import type { NextApiRequest, NextApiResponse } from "next";

export default async function CalcomApi(_: NextApiRequest, res: NextApiResponse) {
  res.status(201).json({ message: "Welcome to Cal.com API - docs are at https://developer.cal.com/api" });
}
