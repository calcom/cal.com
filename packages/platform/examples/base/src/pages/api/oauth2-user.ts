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
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { email, authorizationCode } = body;

  const existingUser = await prisma.user.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      calcomUserId: true,
      email: true,
      calcomUsername: true,
      accessToken: true,
    },
  });
  if (existingUser && existingUser.calcomUserId) {
    return res.status(200).json({
      id: existingUser.calcomUserId,
      email: existingUser.email,
      username: existingUser.calcomUsername ?? "",
      accessToken: existingUser.accessToken ?? "",
    });
  }

  const oAuthUser = await createOAuthUser(
    authorizationCode,
    email,
    "Keith",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=3023&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );

  return res.status(200).json(oAuthUser);
}

async function createOAuthUser(authorizationCode: string, email: string, name: string, avatarUrl: string) {
  const localUser = await prisma.user.create({
    data: {
      email,
    },
  });

  const exchangeResponse = await fetch(
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/auth/oauth2/clients/${process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID}/exchange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        origin: "http://localhost:4321",
      },
      body: JSON.stringify({
        code: authorizationCode,
        clientSecret: process.env.OAUTH2_CLIENT_SECRET_PLAIN,
        redirectUri: process.env.OAUTH2_REDIRECT_URI,
      }),
    }
  );

  const exchangeResponseBody = await exchangeResponse.json();

  const acccessToken = exchangeResponseBody.data.access_token;
  const refreshToken = exchangeResponseBody.data.refresh_token;

  const me = await fetch(`${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/me`, {
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      Authorization: `Bearer ${acccessToken}`,
    },
  });

  const meResponseBody = await me.json();

  await prisma.user.update({
    data: {
      refreshToken: refreshToken ?? "",
      accessToken: acccessToken ?? "",
      calcomUserId: meResponseBody.data?.id,
      calcomUsername: (meResponseBody.data?.username as string) ?? "",
    },
    where: { id: localUser.id },
  });

  return { ...meResponseBody.data, accessToken: acccessToken };
}
