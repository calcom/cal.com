import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";

export const getAirtableToken = async (userId: number) => {
  const credentials = await prisma.credential.findFirst({
    where: {
      type: "airtable_other_calendar",
      userId,
    },
    select: {
      key: true,
    },
  });

  return appKeysSchema.parse(credentials?.key);
};
