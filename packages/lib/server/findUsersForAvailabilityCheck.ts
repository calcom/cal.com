import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/lib/delegationCredential/server";
import { availabilityUserSelect, prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { Prisma } from "@prisma/client";

import { withSelectedCalendars } from "./withSelectedCalendars";

export async function findUsersForAvailabilityCheck({ where }: { where: Prisma.UserWhereInput }) {
  const user = await prisma.user.findFirst({
    where,
    select: {
      ...availabilityUserSelect,
      selectedCalendars: true,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
    },
  });

  if (!user) {
    return null;
  }

  return await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: withSelectedCalendars(user),
  });
}
