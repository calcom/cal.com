import { JobName, dispatcher } from "@calid/job-dispatcher";
import type { CalendlyImportJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import { encode, getToken } from "next-auth/jwt";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";

export const shouldNotifyBookers = (req: NextApiRequest) => {
  return req.headers.cookie?.includes("notifyBookers=true") ?? true;
};

export const refreshSessionTokenAfterOnboarding = async ({
  req,
  res,
  userId,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  userId: number;
}) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return;
  }

  const token = await getToken({ req, secret });
  if (!token?.sub || Number(token.sub) !== userId) {
    return;
  }

  const updatedToken = {
    ...token,
    completedOnboarding: true,
  };
  const encodedToken = await encode({
    secret,
    token: updatedToken,
  });
  const useSecureCookies = (process.env.NEXT_PUBLIC_WEBAPP_URL || "").startsWith("https://");
  const sessionCookie = defaultCookies(useSecureCookies).sessionToken;
  const cookieValue = serialize(sessionCookie.name, encodedToken, {
    ...sessionCookie.options,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  const existing = res.getHeader("Set-Cookie");
  if (existing) {
    res.setHeader(
      "Set-Cookie",
      Array.isArray(existing) ? [...existing, cookieValue] : [existing, cookieValue]
    );
  } else {
    res.setHeader("Set-Cookie", [cookieValue]);
  }
};

export const finalizeOnboardingFromCalendly = async ({
  userId,
  accessToken,
  refreshToken,
  ownerUniqIdentifier,
  createdAt,
  expiresIn,
  sendCampaignEmails,
}: {
  userId: number;
  accessToken: string;
  refreshToken: string;
  ownerUniqIdentifier: string;
  createdAt: number;
  expiresIn: number;
  sendCampaignEmails: boolean;
}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      locale: true,
      timeZone: true,
      defaultScheduleId: true,
      metadata: true,
      completedOnboarding: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.completedOnboarding) {
    return;
  }

  const payload: CalendlyImportJobData = {
    name: JobName.CALENDLY_IMPORT,
    sendCampaignEmails,
    userCalendlyIntegrationProvider: {
      accessToken,
      refreshToken,
      ownerUniqIdentifier,
      createdAt,
      expiresIn,
    },
    user: {
      id: user.id,
      name: user.name ?? "Unknown",
      email: user.email,
      slug: user.username ?? `user-${user.id}`,
    },
  };

  await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDLY_IMPORT,
    data: payload,
    forceInngest: true,
  });

  const locale = user.locale ?? "en";
  const t = await getTranslation(locale, "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const createdSchedule = await prisma.schedule.create({
    data: {
      name: t("default_schedule_name"),
      timeZone: user.timeZone,
      user: {
        connect: {
          id: user.id,
        },
      },
      availability: {
        createMany: {
          data: availability.map((schedule) => ({
            days: schedule.days,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        },
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultScheduleId: user.defaultScheduleId ?? createdSchedule.id,
      completedOnboarding: true,
      bio: t("default_user_bio"),
    },
  });
};
