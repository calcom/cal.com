import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { enrichUserWithDelegationCredentialsWithoutOrgId } from "../delegationCredential/server";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = { id: SessionUser["id"]; email: SessionUser["email"] };

/**
 * It includes in-memory DelegationCredential credentials as well.
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

  const { credentials: allCredentials } = await enrichUserWithDelegationCredentialsWithoutOrgId({
    user: {
      email: user.email,
      id: user.id,
      credentials,
    },
  });

  return allCredentials;
}
