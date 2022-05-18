import CredentialsProvider from "next-auth/providers/credentials";
import { getSession } from "next-auth/react";

import prisma from "@lib/prisma";

const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { label: "Username", type: "text " },
  },
  async authorize(creds, req) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore need to figure out how to correctly type this
    const session = await getSession({ req });
    if (session?.user.role !== "ADMIN") {
      throw new Error("You do not have permission to do this.");
    }

    if (session?.user.username === creds?.username) {
      throw new Error("You cannot impersonate yourself.");
    }

    const user = await prisma.user.findUnique({
      where: {
        username: creds?.username,
      },
    });

    if (!user) {
      throw new Error("This user does not exist");
    }

    // Log impersonations for audit purposes
    await prisma.impersonations.create({
      data: {
        impersonatedBy: {
          connect: {
            id: session.user.id,
          },
        },
        impersonatedUser: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    const obj = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      impersonatedByUID: session?.user.id,
    };
    return obj;
  },
});

export default ImpersonationProvider;
