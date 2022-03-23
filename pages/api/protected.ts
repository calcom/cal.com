// This is an example of how to read a JSON Web Token from an API route
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export default async function jwt(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret, raw: false });
  if (token) {
    res.send({
      content: "This is protected content. You can access this content because you are signed in.",
      token,
    });
  } else {
    res.send({
      error: "You must be signed in to view the protected content on this page.",
    });
  }
}
