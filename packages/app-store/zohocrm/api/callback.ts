import type { AxiosError } from "axios";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

const log = logger.getSubLogger({ prefix: ["[zohocrm/callback]"] });

/**
 * Helper to format Axios errors in a human-readable way
 */
const formatAxiosError = (error: unknown, context: string) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return {
      context,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      url: axiosError.config?.url,
      method: axiosError.config?.method?.toUpperCase(),
      message: axiosError.message,
      responseData: axiosError.response?.data,
      code: axiosError.code,
    };
  }
  return {
    context,
    error: error instanceof Error ? error.message : String(error),
  };
};

function isAuthorizedAccountsServerUrl(accountsServer: string) {
  // As per https://www.zoho.com/crm/developer/docs/api/v6/multi-dc.html#:~:text=US:%20https://accounts.zoho,https://accounts.zohocloud.ca&text=The%20%22location=us%22%20parameter,domain%20in%20all%20API%20endpoints.&text=You%20must%20make%20the%20authorization,.zoho.com.cn.
  const authorizedAccountServers = [
    "https://accounts.zoho.com",
    "https://accounts.zoho.eu",
    "https://accounts.zoho.in",
    "https://accounts.zoho.com.cn",
    "https://accounts.zoho.jp",
    "https://accounts.zohocloud.ca",
    "https://accounts.zoho.com.au",
  ];
  return authorizedAccountServers.includes(accountsServer);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, "accounts-server": accountsServer } = req.query;

  // Validate code parameter
  if (code === undefined || typeof code !== "string") {
    log.warn("Missing or invalid code parameter", { code });
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  // Validate accounts-server parameter
  if (!accountsServer || typeof accountsServer !== "string") {
    log.warn("Missing or invalid accounts-server parameter", { accountsServer });
    res.status(400).json({ message: "`accounts-server` is required and must be a string" });
    return;
  }

  // Validate authorized accounts server
  if (!isAuthorizedAccountsServerUrl(accountsServer)) {
    log.warn("Unauthorized accounts-server", { accountsServer });
    res.status(400).json({ message: "`accounts-server` is not authorized" });
    return;
  }

  // Validate user session
  if (!req.session?.user?.id) {
    log.warn("Unauthenticated callback attempt");
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    // Get app credentials
    let clientId = "";
    let clientSecret = "";
    const appKeys = await getAppKeysFromSlug("zohocrm");

    if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;

    if (!clientId) {
      log.error("Zoho CRM client_id is missing from app keys");
      return res.status(400).json({ message: "Zoho CRM consumer key missing." });
    }

    if (!clientSecret) {
      log.error("Zoho CRM client_secret is missing from app keys");
      return res.status(400).json({ message: "Zoho CRM consumer secret missing." });
    }

    // Exchange authorization code for access token
    const url = `${accountsServer}/oauth/v2/token`;
    const redirectUri = `${WEBAPP_URL}/api/integrations/zohocrm/callback`;
    const formData = {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    };

    log.debug("Exchanging authorization code for access token", {
      accountsServer,
      userId: req.session.user.id,
    });

    const zohoCrmTokenInfo = await axios({
      method: "post",
      url: url,
      data: qs.stringify(formData),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    // Check if token response contains an error
    if (zohoCrmTokenInfo.data.error) {
      log.error("Zoho CRM token exchange returned an error", {
        error: zohoCrmTokenInfo.data.error,
        errorDescription: zohoCrmTokenInfo.data.error_description,
      });
      return res.status(400).json({
        message: `Failed to obtain access token: ${
          zohoCrmTokenInfo.data.error_description || zohoCrmTokenInfo.data.error
        }`,
      });
    }

    // Set expiry date as offset from current time
    zohoCrmTokenInfo.data.expiryDate = Math.round(Date.now() + 60 * 60);
    zohoCrmTokenInfo.data.accountServer = accountsServer;

    log.debug("Successfully obtained Zoho CRM access token", {
      userId: req.session.user.id,
      accountsServer,
    });

    // Create OAuth credential
    await createOAuthAppCredential(
      { appId: appConfig.slug, type: appConfig.type },
      zohoCrmTokenInfo.data,
      req
    );

    log.info("Zoho CRM credential created successfully", {
      userId: req.session.user.id,
    });

    const state = decodeOAuthState(req);

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "zohocrm" })
    );
  } catch (error) {
    log.error("Zoho CRM OAuth callback failed", formatAxiosError(error, "oauthCallback"));

    // Try to decode state for redirect even on error
    const state = decodeOAuthState(req);
    const errorRedirectUrl = state?.returnTo
      ? `${getSafeRedirectUrl(state.returnTo)}?error=zohocrm_auth_failed`
      : `${getInstalledAppPath({ variant: "other", slug: "zohocrm" })}?error=zohocrm_auth_failed`;

    // Send user-friendly error response
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 500;
      const errorMessage =
        axiosError.response?.data?.error_description ||
        axiosError.response?.data?.error ||
        "Failed to complete Zoho CRM authentication";

      return res.status(statusCode).json({
        message: errorMessage,
        redirectUrl: errorRedirectUrl,
      });
    }

    // Generic error fallback
    return res.status(500).json({
      message: "An unexpected error occurred during Zoho CRM authentication",
      redirectUrl: errorRedirectUrl,
    });
  }
}
