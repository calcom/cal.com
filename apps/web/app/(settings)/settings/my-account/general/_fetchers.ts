"use server";

import { withUser } from "@lib/withUser";

export const getGeneralData = withUser(async (session) => {
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      locale: true,
      timeFormat: true,
      weekStart: true,
      timeZone: true,
      allowDynamicBooking: true,
    },
  });

  return user;
});
