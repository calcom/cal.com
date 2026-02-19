import { JobName, dispatcher } from "@calid/job-dispatcher";
import type { CalendlyImportJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";
import { CalendlyOAuthProvider } from "@onehash/calendly";
import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { IntegrationProvider } from "@calcom/prisma/client";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const {
  NEXT_PUBLIC_CALENDLY_CLIENT_ID,
  CALENDLY_CLIENT_SECRET,
  NEXT_PUBLIC_CALENDLY_REDIRECT_URI,
  NEXT_PUBLIC_CALENDLY_OAUTH_URL,
} = process.env;

const updateTokensInDb = async (params: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  expiresIn: number;
}) => {
  const updatedDoc = await prisma.integrationAccounts.update({
    where: {
      userId_provider: {
        userId: parseInt(params.userId),
        provider: IntegrationProvider.CALENDLY,
      },
    },
    data: {
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresIn: params.expiresIn,
      createdAt: params.createdAt,
    },
  });
  return updatedDoc;
};

const refreshTokenIfExpired = async (
  userCalendlyIntegrationProvider: {
    userId: number;
    provider: "CALENDLY";
    tokenType: string | null;
    expiresIn: number | null;
    createdAt: number | null;
    refreshToken: string;
    accessToken: string;
    scope: string | null;
    ownerUniqIdentifier: string | null;
  },
  userId: string
) => {
  const cOService = new CalendlyOAuthProvider({
    clientId: NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
    clientSecret: CALENDLY_CLIENT_SECRET ?? "",
    redirectUri: NEXT_PUBLIC_CALENDLY_REDIRECT_URI ?? "",
    oauthUrl: NEXT_PUBLIC_CALENDLY_OAUTH_URL ?? "",
  });

  const isTokenValid = await cOService.introspectToken({
    accessToken: userCalendlyIntegrationProvider.accessToken,
    refreshToken: userCalendlyIntegrationProvider.refreshToken,
  });

  if (!isTokenValid) {
    const freshTokenData = await cOService.requestNewAccessToken(
      userCalendlyIntegrationProvider.refreshToken
    );
    const updatedConfig = await updateTokensInDb({
      userId,
      accessToken: freshTokenData.access_token,
      refreshToken: freshTokenData.refresh_token,
      createdAt: freshTokenData.created_at,
      expiresIn: freshTokenData.expires_in,
    });
    userCalendlyIntegrationProvider.accessToken = updatedConfig.accessToken;
    userCalendlyIntegrationProvider.refreshToken = updatedConfig.refreshToken;
    userCalendlyIntegrationProvider.createdAt = updatedConfig.createdAt;
    userCalendlyIntegrationProvider.expiresIn = updatedConfig.expiresIn;
  }
};

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, sendCampaignEmails } = req.query as {
    userId: string;
    sendCampaignEmails: string;
  };

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing User ID",
    });
  }

  const userIntID = parseInt(userId);

  if (isNaN(userIntID)) {
    return res.status(400).json({
      success: false,
      message: "Invalid User ID",
    });
  }

  try {
    const userCalendlyIntegrationProvider = await prisma.integrationAccounts.findFirst({
      where: {
        userId: userIntID,
        provider: IntegrationProvider.CALENDLY,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            locale: true,
            username: true,
          },
        },
      },
    });

    if (!userCalendlyIntegrationProvider) {
      return res.status(401).json({
        success: false,
        message: "Calendly integration not found. Please connect your Calendly account first.",
      });
    }

    await refreshTokenIfExpired(userCalendlyIntegrationProvider, userId);

    if (!userCalendlyIntegrationProvider.ownerUniqIdentifier) {
      return res.status(400).json({
        success: false,
        message: "Missing Calendly user identifier. Please reconnect your Calendly account.",
      });
    }

    const payload: CalendlyImportJobData = {
      sendCampaignEmails: sendCampaignEmails === "true",
      userCalendlyIntegrationProvider: {
        accessToken: userCalendlyIntegrationProvider.accessToken,
        refreshToken: userCalendlyIntegrationProvider.refreshToken,
        ownerUniqIdentifier: userCalendlyIntegrationProvider.ownerUniqIdentifier,
        createdAt: userCalendlyIntegrationProvider.createdAt ?? Date.now(),
        expiresIn: userCalendlyIntegrationProvider.expiresIn ?? 7200,
      },
      user: {
        id: userIntID,
        name: userCalendlyIntegrationProvider.user.name ?? "Unknown",
        email: userCalendlyIntegrationProvider.user.email,
        slug: userCalendlyIntegrationProvider.user.username ?? `user-${userIntID}`,
      },
    };

    const { jobId } = await dispatcher.dispatch({
      queue: QueueName.DATA_SYNC,
      name: JobName.CALENDLY_IMPORT,
      data: payload,
      options: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days
          count: 1000,
        },
      },
    });

    console.log(`Calendly import job dispatched for user ${userIntID} with jobId: ${jobId}`);

    return res.status(200).json({
      success: true,
      message: "Calendly import started successfully",
      jobId,
      userId: userIntID,
    });
  } catch (error) {
    console.error("Error dispatching Calendly import job:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start Calendly import",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
