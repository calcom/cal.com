import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { hashPassword } from "../../../lib/auth";
import { User } from "../../../node_modules/.prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<User | any> => {
  const data = req.body;
  const { password, email } = data;

  // Check valid method
  if (!["POST", "PATCH"].includes(req.method)) return;

  // Check valid email
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          username: email,
        },
        {
          email: email,
        },
      ],
      AND: [
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (req.method === "POST" && existingUser) {
    return res.status(409).json({ message: "Email address is already registered" });
  } else if (req.method === "PATCH" && !existingUser) {
    return res.status(404).json({ message: "Email address is not found" });
  }

  // Create new user
  const hashedPassword = await hashPassword(password);
  const newUser = await prisma.user.upsert({
    where: { email },
    update: {
      username: email,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
    },
    create: {
      username: email,
      email,
      password: hashedPassword,
    },
  });

  return newUser;
};

export default handler;
