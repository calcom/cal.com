import { getCredentialForCalendarService } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getAllDomainWideDelegationCredentialsForUser } from "../domainWideDelegation/server";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = { id: SessionUser["id"]; email: SessionUser["email"] };

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

  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({
    user: {
      email: user.email,
      id: user.id,
    },
  });
  return [
    ...credentials.map((credential) => ({ ...credential, delegatedToId: null })),
    ...domainWideDelegationCredentials,
  ];
}

export async function getUsersCredentialsForCalendarService(user: User) {
  const credentials = await getUsersCredentials(user);

  return await Promise.all(credentials.map((credential) => getCredentialForCalendarService(credential)));
}
