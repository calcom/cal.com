import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth/[...nextauth]";

export default async function session(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res }, authOptions);
  /* ... */
  if (session) {
    res.send(JSON.stringify(session, null, 2));
  } else {
    res.end();
  }
}
