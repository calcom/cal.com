import CredentialsProvider from "next-auth/providers/credentials";

import { getSession } from "@calcom/features/auth/lib/getSession";
import prisma from "@calcom/prisma";

async function getLinkedUser({ linkedById, linkedToId }: { linkedById: number; linkedToId: number }) {
  return prisma.user.findUnique({
    where: {
      id: linkedToId,
      linkedBy: {
        some: {
          id: linkedById,
        },
      },
    },
    select: {
      id: true,
      username: true,
      role: true,
      name: true,
      email: true,
      organizationId: true,
      disableImpersonation: true,
      locale: true,
      linkedTo: { select: { id: true } },
    },
  });
}

const LinkedUserProvider = CredentialsProvider({
  id: "linked-user-auth",
  name: "Linked User",
  type: "credentials",
  credentials: {
    id: { type: "string" },
  },
  async authorize(creds, req) {
    const session = await getSession({ req });

    if (!creds?.id) throw new Error("User identifier must be present");

    const credsId = parseInt(creds.id);

    if (session?.user.id === credsId) throw new Error("You cannot switch to yourself.");

    const linkedUser = await getLinkedUser({ linkedById: session?.user.id as number, linkedToId: credsId });

    if (!linkedUser) throw new Error("You cannot switch to this user.");

    return {
      id: linkedUser.id,
      username: linkedUser.username,
      email: linkedUser.email,
      name: linkedUser.name,
      role: linkedUser.role,
      organizationId: linkedUser.organizationId,
      locale: linkedUser.locale,
      linkedTo: linkedUser.linkedTo,
    };
  },
});

export default LinkedUserProvider;
