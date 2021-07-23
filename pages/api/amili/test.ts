import { NextApiRequest, NextApiResponse } from "next";
import runMiddleware, { checkAmiliAuth } from "../../../lib/amili/middleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method, url } = req;

  console.log({ method, path: url });
  await runMiddleware(req, res, checkAmiliAuth);
  res.status(201).json({ message: "Test middleware" });
};

export default handler;
