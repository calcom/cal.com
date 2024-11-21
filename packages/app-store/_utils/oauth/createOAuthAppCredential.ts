import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../oauth/decodeOAuthState";
import { throwIfNotHaveAdminAccessToTeam } from "../throwIfNotHaveAdminAccessToTeam";

/**
 * This function is used to create app credentials for either a user or a team
 *
 * @param appData information about the app
 * @param appData.type the app slug
 * @param appData.appId the app slug
 * @param key the keys for the app's credentials
 * @param req the request object from the API call. Used to determine if the credential belongs to a user or a team
 */
const createOAuthAppCredential = async (
  appData: { type: string; appId: string },
  key: unknown,
  req: NextApiRequest
) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  // For OAuth flows, see if a teamId was passed through the state
  const state = decodeOAuthState(req);
  if (state?.teamId) {
    // Check that the user belongs to the team
    await throwIfNotHaveAdminAccessToTeam({ teamId: state?.teamId ?? null, userId });
  }

  const baseData = {
    type: appData.type,
    key: key || {},
    appId: appData.appId,
    ...(state?.teamId ? { teamId: state.teamId } : { userId }),
  };

  // Always use upsert
  return await prisma.credential.upsert({
    where: { id: state?.credentialId || "non-existent-id" }, // Use a dummy ID if not upgrading
    create: baseData,
    update: baseData,
  });
};

export default createOAuthAppCredential;

// {"scope":"base,deals:read,activities:full,contacts:full,users:read,recents:read,search:read,leads:full,phone-integration,goals:read,projects:full,webhooks:full","api_domain":"https://rajesh-sandbox.pipedrive.com","expires_in":3599,"expiryDate":1732152886432,"token_type":"Bearer","access_token":"v1u:AQIBAHj-LzTNK2yuuuaLqifzhWb9crUNKTpk4FlQ9rjnXqp_6AH1xWIuX4UNV4pLjxXmWX9qAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMFHdktw7w7f0Pjg7rAgEQgDvdZiq5D_z3NrqUDbPJtST4-2TOMCW6wX9bysOeNz1dnXk2iat6N4tJCtsyTenFd4dHuS53Kg7r436P0Q:2Qjm-t7XCRhBqwGYEKQKpy7MeDqqymjypI07GnEoCuptLPCHAW5OOvD3zI8h01BytSkn0p6dGmtRD0vRtvtFrvJRJrKAU8DkopXGUjiuJ5jkxE_MTGWOocZFdI3l2sZUQCZdzkY7ORIsc6HcU1UeW1-XqY5m4enzEPDDqvwbD6VGrWQu-5E-I-IaFeZSnwokN1mbeohQDW2qf558as3CmYX37PQlhpJbpNN9GpYLkHdS0vouFnNvfca4LRznSsXPP8mCH3yNm99oV0hXvJPHhn1YE91InHjX34ux2LNVjPefho4hw01VoG4CSzWXtPtBXFWCxBr1Mn_HZZjwTkU4SMKmdVhxEZvVQyLkn6eLfYVsFt2bB3DRpP7-_fpljOIQE1FJiuLrY_Csj1-sS7zsgU3G8lk97bQj0f2OuV-8-L_0nX-xVqcbsq1lttJ6miE4U1XK52J3A98YuRx20dDmiYk","accountServer":"https://oauth.pipedrive.com","refresh_token":"13889020:22560501:4e441fcdebad4f17ad546d8875243b55d0f3bb3f","last_updated_on":"2024-11-21T01:34:42.832Z"}
