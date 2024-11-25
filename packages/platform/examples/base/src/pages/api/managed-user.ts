// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import prisma from "../../lib/prismaClient";

type Data = {
  email: string;
  username: string;
  id: number;
  accessToken: string;
};

// example endpoint to create a managed cal.com user
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { emails } = JSON.parse(req.body);
  const emailOne = emails[0];
  const emailTwo = emails[1];

  const existingUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
  if (existingUser && existingUser.calcomUserId) {
    return res.status(200).json({
      id: existingUser.calcomUserId,
      email: existingUser.email,
      username: existingUser.calcomUsername ?? "",
      accessToken: existingUser.accessToken ?? "",
    });
  }

  const localUserOne = await prisma.user.create({
    data: {
      email: emailOne,
    },
  });

  const localUserTwo = await prisma.user.create({
    data: {
      email: emailTwo,
    },
  });

  const response = await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/oauth-clients/${process.env.NEXT_PUBLIC_X_CAL_ID}/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        email: emailOne,
        name: "John Jones",
        avatarUrl:
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=3023&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      }),
    }
  );

  const body = await response.json();
  await prisma.user.update({
    data: {
      refreshToken: (body.data?.refreshToken as string) ?? "",
      accessToken: (body.data?.accessToken as string) ?? "",
      calcomUserId: body.data?.user.id,
      calcomUsername: (body.data?.user.username as string) ?? "",
    },
    where: { id: localUserOne.id },
  });

  const responseTwo = await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/oauth-clients/${process.env.NEXT_PUBLIC_X_CAL_ID}/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        email: emailTwo,
        name: "Jane Doe",
        avatarUrl:
          "https://plus.unsplash.com/premium_photo-1668319915476-5cc7717e00f1?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      }),
    }
  );
  const bodyTwo = await responseTwo.json();
  await prisma.user.update({
    data: {
      refreshToken: (bodyTwo.data?.refreshToken as string) ?? "",
      accessToken: (bodyTwo.data?.accessToken as string) ?? "",
      calcomUserId: bodyTwo.data?.user.id,
      calcomUsername: (bodyTwo.data?.user.username as string) ?? "",
    },
    where: { id: localUserTwo.id },
  });

  await createDefaultSchedule(body.data?.accessToken as string);
  await createDefaultSchedule(bodyTwo.data?.accessToken as string);

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const organizationId = process.env.ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error("Organization ID is not set");
  }

  const team = await createTeam(+organizationId, "Team Doe");
  if (!team) {
    throw new Error("Failed to create team. Probably your platform team does not have required plan.");
  }

  await createMembership(+organizationId, team.id, body.data?.user.id);
  await createMembership(+organizationId, team.id, bodyTwo.data?.user.id);
  await createCollectiveEventType(+organizationId, team.id, [body.data?.user.id, bodyTwo.data?.user.id]);

  return res.status(200).json({
    id: body?.data?.user?.id,
    email: (body.data?.user.email as string) ?? "",
    username: (body.data?.username as string) ?? "",
    accessToken: (body.data?.accessToken as string) ?? "",
  });
}

async function createTeam(orgId: number, name: string) {
  const response = await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/organizations/${orgId}/teams`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_CLIENT_ID]: process.env.NEXT_PUBLIC_X_CAL_ID ?? "",
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        name,
        bannerUrl: "https://i.cal.com/api/avatar/949be534-7a88-4185-967c-c020b0c0bef3.png",
      }),
    }
  );

  const body = await response.json();
  return body.data;
}

async function createMembership(orgId: number, teamId: number, userId: number) {
  await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/organizations/${orgId}/teams/${teamId}/memberships`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_CLIENT_ID]: process.env.NEXT_PUBLIC_X_CAL_ID ?? "",
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        userId,
        accepted: true,
      }),
    }
  );
}

async function createCollectiveEventType(orgId: number, teamId: number, userIds: number[]) {
  await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/organizations/${orgId}/teams/${teamId}/event-types`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        [X_CAL_CLIENT_ID]: process.env.NEXT_PUBLIC_X_CAL_ID ?? "",
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        lengthInMinutes: 60,
        title: "Doe collective",
        slug: "doe-collective",
        schedulingType: "COLLECTIVE",
        hosts: userIds.map((userId) => ({ userId })),
      }),
    }
  );
}

async function createDefaultSchedule(accessToken: string) {
  const name = "Default Schedule";
  const timeZone = "Europe/London";
  const isDefault = true;

  const response = await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/schedules`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name,
        timeZone,
        isDefault,
      }),
    }
  );

  const schedule = await response.json();
  return schedule;
}
