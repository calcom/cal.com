/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { hashPassword } from "@calcom/feature-auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultResponder } from "@calcom/lib/server";
import type { Prisma } from "@calcom/prisma/client";
import { IdentityProvider } from "@calcom/prisma/enums";
import { appKeysSchema as zohoKeysSchema } from "@calcom/zohocalendar/zod";

import { sendMail } from "../../lib/mailer";
import setupZohoCalenderOauthEmail from "../../lib/mailer/templates/setupZohoCalenderOauthEmail";
import { setupManagedZohoUserRequestSchema } from "../../validation/schemas";

const createSchedule = async (input: { name: string; schedule: any }, user: any, prisma: PrismaClient) => {
  const data: Prisma.ScheduleCreateInput = {
    name: input.name,
    user: {
      connect: {
        id: user.id,
      },
    },
  };

  const availability = getAvailabilityFromSchedule(input.schedule || DEFAULT_SCHEDULE);
  data.availability = {
    createMany: {
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    },
  };

  data.timeZone = user.timeZone;

  const schedule = await prisma.schedule.create({
    data,
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      defaultScheduleId: schedule.id,
    },
  });

  return { schedule };
};

async function postHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any };

  const body = setupManagedZohoUserRequestSchema.parse($req.body);
  const prisma: PrismaClient = $req.prisma;

  const existingSetupEntry = await prisma.zohoSchedulingSetup.findFirst({
    where: {
      zuid: body.zuid,
    },
  });
  if (existingSetupEntry) {
    throw new Error("zoho user already has a managed setup in progress");
  }

  // create cal user
  const email = body.email.toLowerCase();
  const username = email.split("@").shift();
  const password = "some-default-password";
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      username,
      email,
      password: { create: { hash: hashedPassword } },
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
      timeZone: body.timeZone,
      completedOnboarding: true,
    },
  });

  // create setup entry
  const managedSetup = await prisma.zohoSchedulingSetup.create({
    data: {
      zuid: body.zuid,
      zoomUserId: body.zoomUserId,
      userId: user.id,
      status: "In Progress",
    },
  });

  await createSchedule(
    {
      name: "Working Hours",
      schedule: body.schedule,
    },
    user,
    prisma
  );

  // setup zoom
  const appData = { appId: "zoom", type: "zoom_video" };
  const zoomKey = {
    user_id: body.zoomUserId,
    scope: "meeting:write",
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 20)).valueOf(),
    token_type: "bearer",
    access_token: "-",
    refresh_token: "-",
  };

  await prisma.credential.create({
    data: {
      type: appData.type,
      key: zoomKey,
      userId: user.id,
      appId: appData.appId,
    },
  });

  // send zoho calendar oauth link
  const OAUTH_BASE_URL = "https://accounts.zoho.com/oauth/v2";

  const appKeys = await getAppKeysFromSlug("zohocalendar");
  const { client_id } = zohoKeysSchema.parse(appKeys);

  const state = JSON.stringify({
    managedSetupReturnTo: `${WEBAPP_URL}/esa/complete-setup`,
    onErrorReturnTo: `${WEBAPP_URL}/esa/complete-setup`,
    fromManagedSetup: true,
    managedSetupId: managedSetup.id,
    userId: user.id,
  });

  const params = {
    client_id,
    response_type: "code",
    redirect_uri: `${WEBAPP_URL}/api/integrations/zohocalendar/callback`,
    scope: [
      "ZohoCalendar.calendar.ALL",
      "ZohoCalendar.event.ALL",
      "ZohoCalendar.freebusy.READ",
      "AaaServer.profile.READ",
    ],
    access_type: "offline",
    state,
    prompt: "consent",
  };

  const query = stringify(params);
  const url = `${OAUTH_BASE_URL}/auth?${query}`;

  await sendMail({
    from: "buffer-sender@buffer-staging.esa-emails.technology",
    to: "talor.dcs@gmail.com",
    subject: "",
    html: setupZohoCalenderOauthEmail({ url }),
  });

  return {
    message: "Managed setup in progress",
    data: {
      url,
    },
  };
}

export default defaultResponder(postHandler);
