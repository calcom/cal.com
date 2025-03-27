import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { OAuth2Client } from "googleapis-common";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const stateSchema = z.object({
  teamId: z.string(),
});

async function getHandler(request: NextRequest) {
  try {
    const headersList = await headers();
    const cookiesList = await cookies();
    const legacyReq = buildLegacyRequest(headersList, cookiesList);

    const session = await getServerSession({ req: legacyReq });

    if (!session?.user?.id) {
      return NextResponse.json({ message: "You must be logged in to do this" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!state) {
      return NextResponse.json({ message: "No state provided" }, { status: 400 });
    }

    const parsedState = stateSchema.parse(JSON.parse(state));
    const { teamId } = parsedState;

    await throwIfNotHaveAdminAccessToTeam({
      teamId: Number(teamId) ?? null,
      userId: session.user.id,
    });

    if (!code || typeof code !== "string") {
      return NextResponse.json({ message: "`code` must be a string" }, { status: 400 });
    }

    const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");

    if (!client_id || typeof client_id !== "string")
      return NextResponse.json({ message: "Google client_id missing." }, { status: 400 });

    if (!client_secret || typeof client_secret !== "string")
      return NextResponse.json({ message: "Google client_secret missing." }, { status: 400 });

    const redirect_uri = `${WEBAPP_URL}/api/teams/googleworkspace/callback`;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    const credentials = await oAuth2Client.getToken(code);

    await prisma.credential.create({
      data: {
        type: "google_workspace_directory",
        key: credentials.res?.data,
        userId: session.user.id,
      },
    });

    let redirectUrl = `${WEBAPP_URL}/settings`;

    if (teamId) {
      redirectUrl = `${WEBAPP_URL}/settings/teams/${teamId}/members?inviteModal=true&bulk=true`;
    }

    const safeRedirectUrl = getSafeRedirectUrl(redirectUrl) ?? `${WEBAPP_URL}/teams`;
    return NextResponse.redirect(safeRedirectUrl);
  } catch (error) {
    console.error("Error in Google Workspace callback:", error);

    // Redirect to teams page on error
    return NextResponse.redirect(`${WEBAPP_URL}/teams`);
  }
}

export const GET = defaultResponderForAppDir(getHandler);
