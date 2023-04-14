import type { NextApiRequest, NextApiResponse } from "next";

let cold = true;
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const coldStart = cold;
  cold = false;
  res.json({ coldStart });
}
