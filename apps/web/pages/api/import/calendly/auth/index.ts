import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
// import { defaultHandler,  } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { IntegrationProvider } from "@calcom/prisma/client";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  // const cookies = parse(req.headers.cookie || "");
  // const { calendlyAccessToken, calendlyRefreshToken } = cookies;
  // if(!calendlyAccessToken || !calendlyRefreshToken) {
  //   return res.status(400).json({ error: "Missing Calendly tokens" });
  // }

  const { userId } = req.query as { userId: string };
  if (!userId) {
    return res.status(400).json({ error: "Missing User ID" });
  }
  try {
    const userCalendlyIntegrationProvider = await prisma.integrationAccounts.findFirst({
      where: {
        userId: parseInt(userId),
        provider: IntegrationProvider.CALENDLY,
      },
    });
    if (!userCalendlyIntegrationProvider) {
      return res.json({ authorized: false });
    }
    return res.json({
      authorized: true,
      authToken: {
        accessToken: userCalendlyIntegrationProvider.accessToken,
        refreshToken: userCalendlyIntegrationProvider.refreshToken,
      },
    });
  } catch (e) {
    console.error("Internal Server Error:", String(e));
    return res.status(500).json({ error: "Internal Server Error", message: String(e) });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
