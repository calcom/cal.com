import { NextApiRequest, NextApiResponse } from "next";
import withMiddleware from "../../../lib/amili/middleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  console.log({ method });

  res.status(201).json({ message: "Test middleware" });
};

export default withMiddleware(handler);
