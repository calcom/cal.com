// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import prisma from "../../lib/prismaClient";

type Data = {
  email: string;
  username: string;
  id: number;
  accessToken: string;
};

// example endpoint to create a managed cal.com user
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { email } = JSON.parse(req.body);

  const existingUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
  if (existingUser && existingUser.calcomUserId) {
    return res.status(200).json({
      id: existingUser.calcomUserId,
      email: existingUser.email,
      username: existingUser.calcomUsername ?? "",
      accessToken: existingUser.accessToken ?? "",
    });
  }
  const localUser = await prisma.user.create({
    data: {
      email,
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
        email,
        name: "John Jones",
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
    where: { id: localUser.id },
  });
  await createDefaultSchedule(body.data?.accessToken as string);
  return res.status(200).json({
    id: body?.data?.user?.id,
    email: (body.data?.user.email as string) ?? "",
    username: (body.data?.username as string) ?? "",
    accessToken: (body.data?.accessToken as string) ?? "",
  });
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
