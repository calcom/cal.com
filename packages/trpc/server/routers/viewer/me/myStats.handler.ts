import type { Session } from "next-auth";

import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type MyStatsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const myStatsHandler = async ({ ctx }: MyStatsOptions) => {
  const { user: sessionUser } = ctx;

  const additionalUserInfo = await new UserRepository(prisma).getUserStats({ userId: sessionUser.id });
  if (!additionalUserInfo) {
    // Handle case where user is not found
    return {
      id: sessionUser.id,
      sumOfBookings: 0,
      sumOfCalendars: 0,
      sumOfTeams: 0,
      sumOfEventTypes: 0,
      sumOfTeamEventTypes: 0,
      availability_configured: false,
      integrations_connected: { razorpay_payment: false, zoom_video: false },
      branding_configured: false,
      workflows_configured: false,
      setup_items_completed: 0,
    };
  }
  const sumOfTeamEventTypes = additionalUserInfo?.calIdTeams.reduce(
    (sum, team) => sum + team.calIdTeam.eventTypes.length,
    0
  );
  const userCredentialTypes = new Set(additionalUserInfo.credentials.map((cred) => cred.type));
  const teamCredentialTypes = new Set(
    additionalUserInfo.calIdTeams.flatMap((team) => team.calIdTeam.credentials.map((cred) => cred.type))
  );
  const hasUserBanner = Boolean(additionalUserInfo.bannerUrl);
  const hasTeamBanner = additionalUserInfo.calIdTeams.some((team) => team.calIdTeam.bannerUrl);

  const hasUserWorkflows = additionalUserInfo.calIdWorkflows.length > 0;
  const hasTeamWorkflows = additionalUserInfo.calIdTeams.some((team) => team.calIdTeam.workflows.length > 0);

  const availability_configured = additionalUserInfo.schedules.length > 0;

  const integrations_connected = {
    razorpay_payment:
      userCredentialTypes.has("razorpay_payment") || teamCredentialTypes.has("razorpay_payment"),
    zoom_video: userCredentialTypes.has("zoom_video") || teamCredentialTypes.has("zoom_video"),
  };

  const branding_configured = hasUserBanner || hasTeamBanner;
  const workflows_configured = hasUserWorkflows || hasTeamWorkflows;

  // Count setup items completed
  const setupItems = [
    availability_configured,
    integrations_connected.razorpay_payment || integrations_connected.zoom_video,
    branding_configured,
    workflows_configured,
  ];
  const setup_items_completed = setupItems.filter(Boolean).length;

  return {
    id: sessionUser.id,
    sumOfBookings: additionalUserInfo?._count.bookings,
    sumOfCalendars: additionalUserInfo?._count.userLevelSelectedCalendars,
    sumOfTeams: additionalUserInfo?._count.teams,
    sumOfEventTypes: additionalUserInfo?._count.eventTypes,
    sumOfTeamEventTypes,
    availability_configured,
    integrations_connected,
    branding_configured,
    workflows_configured,
    setup_items_completed,
  };
};
