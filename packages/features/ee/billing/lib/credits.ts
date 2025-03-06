import { prisma } from "@calcom/prisma";

export async function getMonthlyCredits(teamId: number) {
  // todo: only active subscriptions get credits

  const activeMembers = await prisma.membership.count({
    where: {
      teamId,
      accepted: true,
    },
  });
  // todo: where do I get price per seat from?
  const pricePerSeat = 15;
  const totalMonthlyCredits = activeMembers * ((pricePerSeat / 2) * 100);

  return totalMonthlyCredits;
}
