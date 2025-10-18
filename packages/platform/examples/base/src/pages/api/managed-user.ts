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

async function createUserWithDefaultSchedule(email: string, name: string, avatarUrl: string) {
  const localUser = await prisma.user.create({
    data: {
      email,
    },
  });

  const managedUserResponse = await fetch(
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
        email,
        name,
        avatarUrl,
      }),
    }
  );

  const managedUserResponseBody = await managedUserResponse.json();

  await prisma.user.update({
    data: {
      refreshToken: (managedUserResponseBody.data?.refreshToken as string) ?? "",
      accessToken: (managedUserResponseBody.data?.accessToken as string) ?? "",
      calcomUserId: managedUserResponseBody.data?.user.id,
      calcomUsername: (managedUserResponseBody.data?.user.username as string) ?? "",
    },
    where: { id: localUser.id },
  });

  await createDefaultSchedule(managedUserResponseBody.data?.accessToken as string);

  return managedUserResponseBody.data;
}

// example endpoint to create a managed cal.com user
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { emails } = JSON.parse(req.body);
  const emailOne = emails[0];
  const emailTwo = emails[1];
  const emailThree = emails[2];
  const emailFour = emails[3];
  const emailFive = emails[4];

  const existingUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
  if (existingUser && existingUser.calcomUserId) {
    return res.status(200).json({
      id: existingUser.calcomUserId,
      email: existingUser.email,
      username: existingUser.calcomUsername ?? "",
      accessToken: existingUser.accessToken ?? "",
    });
  }

  const managedUserResponseOne = await createUserWithDefaultSchedule(
    emailOne,
    "Keith",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=3023&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );
  const managedUserResponseTwo = await createUserWithDefaultSchedule(
    emailTwo,
    "Somay",
    "https://plus.unsplash.com/premium_photo-1668319915476-5cc7717e00f1?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );
  const managedUserResponseThree = await createUserWithDefaultSchedule(
    emailThree,
    "Rajiv",
    "https://plus.unsplash.com/premium_photo-1668319915476-5cc7717e00f1?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );
  const managedUserResponseFour = await createUserWithDefaultSchedule(
    emailFour,
    "Morgan",
    "https://plus.unsplash.com/premium_photo-1668319915476-5cc7717e00f1?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );
  const managedUserResponseFive = await createUserWithDefaultSchedule(
    emailFive,
    "Lauris",
    "https://plus.unsplash.com/premium_photo-1668319915476-5cc7717e00f1?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const organizationId = process.env.ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error("Organization ID is not set");
  }

  const team = await createTeam(+organizationId, `Platform devs - ${Date.now()}`);
  if (!team) {
    throw new Error("Failed to create team. Probably your platform team does not have required plan.");
  }

  await createOrgTeamMembershipMember(+organizationId, team.id, managedUserResponseOne.user.id);
  await createOrgTeamMembershipMember(+organizationId, team.id, managedUserResponseTwo.user.id);
  await createOrgTeamMembershipMember(+organizationId, team.id, managedUserResponseThree.user.id);
  await createOrgTeamMembershipMember(+organizationId, team.id, managedUserResponseFour.user.id);

  await createCollectiveEventType(+organizationId, team.id, [
    managedUserResponseOne.user.id,
    managedUserResponseTwo.user.id,
    managedUserResponseThree.user.id,
    managedUserResponseFour.user.id,
  ]);

  await createRoundRobinEventType(+organizationId, team.id, [
    managedUserResponseOne.user.id,
    managedUserResponseTwo.user.id,
    managedUserResponseThree.user.id,
    managedUserResponseFour.user.id,
  ]);

  await createOrgMembershipAdmin(+organizationId, managedUserResponseFive.user.id);

  return res.status(200).json({
    id: managedUserResponseOne?.user?.id,
    email: (managedUserResponseOne.user.email as string) ?? "",
    username: (managedUserResponseOne.user.username as string) ?? "",
    accessToken: (managedUserResponseOne.accessToken as string) ?? "",
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

async function createOrgTeamMembershipMember(orgId: number, teamId: number, userId: number) {
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
        role: "MEMBER",
      }),
    }
  );
}

async function createOrgMembershipAdmin(orgId: number, userId: number) {
  await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/organizations/${orgId}/memberships`,
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
        role: "ADMIN",
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
        title: "Platform example collective",
        slug: "platform-example-collective",
        schedulingType: "collective",
        hosts: userIds.map((userId) => ({ userId })),
      }),
    }
  );
}

async function createRoundRobinEventType(orgId: number, teamId: number, userIds: number[]) {
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
        title: "Platform example round robin",
        slug: "platform-example-round-robin",
        schedulingType: "roundRobin",
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
