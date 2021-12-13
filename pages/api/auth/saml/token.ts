import Cors from "cors";
import { NextApiRequest, NextApiResponse } from "next";

import jackson from "../../../../lib/jackson";

// Initializing the cors middleware
const cors = Cors({
  methods: ["GET", "HEAD"],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("token:", req.query, req.body);

    await runMiddleware(req, res, cors);

    const { oauthController } = await jackson();
    const result = await oauthController.token(req.body);

    res.json(result);
  } catch (err: any) {
    console.error("token error:", err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
