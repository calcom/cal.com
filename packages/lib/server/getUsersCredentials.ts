import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { enrichUserWithDwdCredentialsWithoutOrgId } from "../domainWideDelegation/server";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = { id: SessionUser["id"]; email: SessionUser["email"] };

/**
 * It includes in-memory DWD credentials as well.
 */
export async function getUsersCredentials(user: User) {
  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: credentialForCalendarServiceSelect,
    orderBy: {
      id: "asc",
    },
  });

  const { credentials: allCredentials } = await enrichUserWithDwdCredentialsWithoutOrgId({
    user: {
      email: user.email,
      id: user.id,
      credentials,
    },
  });

  return allCredentials;
}
