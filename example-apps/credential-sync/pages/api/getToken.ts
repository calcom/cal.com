import type { NextApiRequest, NextApiResponse } from "next";
import { CALCOM_CREDENTIAL_SYNC_HEADER_NAME, CALCOM_CREDENTIAL_SYNC_SECRET } from "../../constants";
import { generateGoogleCalendarAccessToken, generateZoomAccessToken } from "../../lib/integrations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers[CALCOM_CREDENTIAL_SYNC_HEADER_NAME];
  console.log("getToken hit");
  try {
    if (!secret) {
      return res.status(403).json({ message: "secret header not set" });
    }
    if (secret !== CALCOM_CREDENTIAL_SYNC_SECRET) {
      return res.status(403).json({ message: "Invalid secret" });
    }

    const calcomUserId = req.body.calcomUserId;
    const appSlug = req.body.appSlug;
    console.log("getToken Params", {
      calcomUserId,
      appSlug,
    });
    let accessToken;
    if (appSlug === "google-calendar") {
      accessToken = await generateGoogleCalendarAccessToken();
    } else if (appSlug === "zoom") {
      accessToken = await generateZoomAccessToken();
    } else {
      throw new Error("Unhandled values");
    }
    if (!accessToken) {
      throw new Error("Unable to generate token");
    }
    res.status(200).json({
      _1: true,
      access_token: accessToken,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
