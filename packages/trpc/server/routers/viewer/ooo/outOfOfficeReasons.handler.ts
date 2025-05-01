import prisma from "@calcom/prisma";

export const outOfOfficeReasonList = async () => {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  return outOfOfficeReasons;
};
