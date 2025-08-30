import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { OAuth2Client } from "googleapis-common";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { WEBAPP_URL } from "@calcom/lib/constants";

const scopes = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.customer.readonly",
];

async function getHandler(request: NextRequest) {
  try {
    // Get appKeys from google-calendar
    const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");

    if (!client_id || typeof client_id !== "string")
      return NextResponse.json({ message: "Google client_id missing." }, { status: 400 });

    if (!client_secret || typeof client_secret !== "string")
      return NextResponse.json({ message: "Google client_secret missing." }, { status: 400 });

    // Get teamId from query params
    const teamId = request.nextUrl.searchParams.get("teamId");

    // use different callback to normal calendar connection
    const redirect_uri = `${WEBAPP_URL}/api/teams/googleworkspace/callback`;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: JSON.stringify({ teamId }),
    });

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating Google Workspace auth URL:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export const GET = defaultResponderForAppDir(getHandler);
