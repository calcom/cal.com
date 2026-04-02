import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { withSelectedCalendars } from "@calcom/lib/server/withSelectedCalendars";
import { availabilityUserSelect, prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

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
