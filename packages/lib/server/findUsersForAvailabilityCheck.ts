import type { Prisma } from "@prisma/client";

import { getAllDomainWideDelegationCalendarCredentialsForUser } from "@calcom/lib/domainWideDelegation/server";
import { availabilityUserSelect } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

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

  const userWithSelectedCalendars = withSelectedCalendars(user);
  const { credentials, ...restUser } = userWithSelectedCalendars;

  return {
    ...restUser,
    credentials: credentials.concat(
      await getAllDomainWideDelegationCalendarCredentialsForUser({ user: restUser })
    ),
  };
}
