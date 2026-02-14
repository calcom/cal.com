// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import prisma from "../../lib/prismaClient";

type Data = {
  accessToken: string;
};

// example endpoint called by the client to refresh the access token of cal.com managed user
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const authHeader = req.headers.authorization;

  const accessToken = authHeader?.split("Bearer ")[1];

  if (accessToken) {
    const localUser = await prisma.user.findUnique({
      where: {
        accessToken: accessToken as string,
      },
    });
    if (localUser?.refreshToken) {
      if (process.env.NEXT_PUBLIC_OAUTH2_MODE === "true") {
        const oAuth2Request = await fetch(
          `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/auth/oauth2/clients/${process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID}/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refreshToken: localUser.refreshToken,
              clientSecret: process.env.OAUTH2_CLIENT_SECRET_PLAIN,
            }),
          }
        );
        if (oAuth2Request.status === 200) {
          const oAuth2Response = await oAuth2Request.json();
          const { access_token: newAccessToken, refresh_token: newRefreshToken } = oAuth2Response.data;

          await prisma.user.update({
            data: {
              refreshToken: newRefreshToken as string,
              accessToken: newAccessToken as string,
            },
            where: { id: localUser.id },
          });
          return res.status(200).json({ accessToken: newAccessToken });
        }

        return res.status(400).json({ accessToken: "" });
      }

      const response = await fetch(
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        `${process.env.NEXT_PUBLIC_CALCOM_API_URL ?? ""}/oauth/${
          // eslint-disable-next-line turbo/no-undeclared-env-vars
          process.env.NEXT_PUBLIC_X_CAL_ID ?? ""
        }/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            [X_CAL_SECRET_KEY]: process.env.X_CAL_SECRET_KEY ?? "",
          },
          body: JSON.stringify({
            refreshToken: localUser.refreshToken,
          }),
        }
      );
      if (response.status === 200) {
        const resp = await response.json();
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = resp.data;

        await prisma.user.update({
          data: {
            refreshToken: (newRefreshToken as string) ?? "",
            accessToken: (newAccessToken as string) ?? "",
          },
          where: { id: localUser.id },
        });
        return res.status(200).json({ accessToken: newAccessToken });
      }

      return res.status(400).json({ accessToken: "" });
    }
  }

  return res.status(404).json({ accessToken: "" });
}
