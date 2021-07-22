import { NextApiRequest, NextApiResponse } from "next";

const withMiddleware = (handler: any) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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

      return handler(req, res);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token!" });
    }
  };
};

export default withMiddleware;
