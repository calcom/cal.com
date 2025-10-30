import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "../delegationCredential/server";

type User = { id: number; email: string };

/**
 * It includes in-memory DelegationCredential credentials as well.
 */
export async function getUsersCredentialsIncludeServiceAccountKey(user: User) {
  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: credentialForCalendarServiceSelect,
    orderBy: {
      id: "asc",
    },
  });

  const { credentials: allCredentials } = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: {
      email: user.email,
      id: user.id,
      credentials,
    },
  });

  return allCredentials;
}

export async function getUsersCredentials(user: User) {
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  return credentials.map(({ delegatedTo: _1, ...rest }) => rest);
}
