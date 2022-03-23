import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

// This local import doesn't work
// import { PrismaClient } from "@calcom/prisma";
const prisma = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET;

type Data = {
  message: string;
};

export default async function me(req: NextApiRequest, res: NextApiResponse<Data>) {
  const token = await getToken({ req, secret, raw: false });
  console.log("token", token);
  if (!token)
    return res.status(404).json({
      message: `You're not authenticated. Provide a valid Session JWT as Authorization: 'Bearer {your_token_here}'`,
    });
  if (!token.email)
    return res.status(404).json({
      message: `Your token doesn't have a valid email`,
    });
  const email: string | undefined = token?.email;
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  return res.json({
    message: `Hello ${user?.name}, your email is ${user?.email}, and your email is ${
      user?.emailVerified ? "verified" : "unverified"
    }`,
  });
}
