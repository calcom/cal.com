import { NextApiRequest, NextApiResponse } from "next";

export const checkAmiliAuth = (req: NextApiRequest, res: NextApiResponse, next: any) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(403).json({ message: "You don't have permission to access this resource!" });
  }

  const token = authorization.replace("Basic ", "");

  if (!token) {
    return res.status(401).json({ message: "Token is required!" });
  }

  const { AMILI_USERNAME, AMILI_PASSWORD } = process.env;

  try {
    const serverToken = Buffer.from(`${AMILI_USERNAME}:${AMILI_PASSWORD}`).toString("base64");

    if (serverToken !== token) {
      return res.status(401).json({ message: "Invalid token!" });
    }

    console.log({ message: "Authenticated" });

    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token!" });
  }
};

const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
};

export default runMiddleware;
