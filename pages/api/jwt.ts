import type { NextApiRequest, NextApiResponse } from "next"
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;
export default async function jwt(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret });
  res.send(JSON.stringify(token, null, 2));
}
