import { admin_directory_v1 } from "@googleapis/admin";
import { OAuth2Client } from "googleapis-common";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type CheckForGCalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const credentialsSchema = z.object({
  refresh_token: z.string().optional(),
  expiry_date: z.number().optional(),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  id_token: z.string().optional(),
  scope: z.string().optional(),
});

export const checkForGWorkspace = async ({ ctx }: CheckForGCalOptions) => {
  const gWorkspacePresent = await prisma.credential.findFirst({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });

  return { id: gWorkspacePresent?.id };
};

export const getUsersFromGWorkspace = async ({}: CheckForGCalOptions) => {
  const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");
  if (!client_id || typeof client_id !== "string") throw new Error("Google client_id missing.");
  if (!client_secret || typeof client_secret !== "string") throw new Error("Google client_secret missing.");

  const hasExistingCredentials = await prisma.credential.findFirst({
    where: {
      type: "google_workspace_directory",
    },
  });
  if (!hasExistingCredentials) {
    throw new Error("No workspace credentials found");
  }

  const credentials = credentialsSchema.parse(hasExistingCredentials.key);

  const oAuth2Client = new OAuth2Client(client_id, client_secret);

  // Set users credentials instead of our app credentials - allowing us to make requests on their behalf
  oAuth2Client.setCredentials(credentials);

  // Create a new instance of the Admin SDK directory API
  const directory = new admin_directory_v1.Admin({
    auth: oAuth2Client as any,
  });
  const { data } = await directory.users.list({
    maxResults: 200, // Up this if we ever need to get more than 200 users
    customer: "my_customer", // This only works for single domain setups - we'll need to change this if we ever support multi-domain setups (unlikely we'll ever need to)
  });

  // We only want their email addresses
  const emails = data.users?.map((user) => user.primaryEmail as string) ?? ([] as string[]);
  return emails;
};

export const removeCurrentGoogleWorkspaceConnection = async ({ ctx }: CheckForGCalOptions) => {
  // There should only ever be one google_workspace_directory credential per user but we delete many as we can't make type unique
  const gWorkspacePresent = await prisma.credential.deleteMany({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });

  return { deleted: gWorkspacePresent?.count };
};
