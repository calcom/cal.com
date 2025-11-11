import { prisma } from "@calcom/prisma";

export const pendingReportsCountHandler = async () => {
  const count = await prisma.bookingReport.count({
    where: {
      status: "PENDING",
      watchlistId: null,
    },
  });

  return count;
};

export default pendingReportsCountHandler;
