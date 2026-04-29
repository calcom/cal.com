import prisma from "@calcom/prisma";

export const outOfOfficeReasonList = async ({ userId }: { userId: number }) => {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    select: {
      id: true,
      emoji: true,
      reason: true,
      enabled: true,
      userId: true,
    },
    where: {
      enabled: true,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: [{ userId: "asc" }, { id: "asc" }],
  });

  return outOfOfficeReasons;
};
