import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";

async function checkAdmin() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user.role !== UserPermissionRole.ADMIN) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getProrationStats() {
  await checkAdmin();

  const [totalProrations, pendingProrations, chargedProrations, failedProrations] = await Promise.all([
    prisma.monthlyProration.count(),
    prisma.monthlyProration.count({ where: { status: "PENDING" } }),
    prisma.monthlyProration.count({ where: { status: "CHARGED" } }),
    prisma.monthlyProration.count({ where: { status: "FAILED" } }),
  ]);

  const totalRevenue = await prisma.monthlyProration.aggregate({
    where: { status: "CHARGED" },
    _sum: { proratedAmount: true },
  });

  const recentProrations = await prisma.monthlyProration.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return {
    stats: {
      total: totalProrations,
      pending: pendingProrations,
      charged: chargedProrations,
      failed: failedProrations,
      totalRevenue: totalRevenue._sum.proratedAmount || 0,
    },
    recentProrations,
  };
}

export async function getSeatChangeStats() {
  await checkAdmin();

  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [totalChanges, currentMonthChanges, additions, removals] = await Promise.all([
    prisma.seatChangeLog.count(),
    prisma.seatChangeLog.count({ where: { monthKey: currentMonthKey } }),
    prisma.seatChangeLog.aggregate({
      where: { changeType: "ADDITION" },
      _sum: { seatCount: true },
    }),
    prisma.seatChangeLog.aggregate({
      where: { changeType: "REMOVAL" },
      _sum: { seatCount: true },
    }),
  ]);

  const recentChanges = await prisma.seatChangeLog.findMany({
    take: 20,
    orderBy: { changeDate: "desc" },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return {
    stats: {
      total: totalChanges,
      currentMonth: currentMonthChanges,
      totalAdditions: additions._sum.seatCount || 0,
      totalRemovals: removals._sum.seatCount || 0,
      currentMonthKey,
    },
    recentChanges,
  };
}

export async function getTeamBillingOverview() {
  await checkAdmin();

  const teams = await prisma.team.findMany({
    where: {
      OR: [{ teamBilling: { isNot: null } }, { organizationBilling: { isNot: null } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
      teamBilling: {
        select: {
          subscriptionId: true,
          customerId: true,
          billingPeriod: true,
          pricePerSeat: true,
          status: true,
        },
      },
      organizationBilling: {
        select: {
          subscriptionId: true,
          customerId: true,
          billingPeriod: true,
          pricePerSeat: true,
          status: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return teams;
}
