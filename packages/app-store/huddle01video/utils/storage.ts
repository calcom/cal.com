import { z } from "zod";

import { prisma } from "@calcom/prisma";

const huddle01AppKeySchema = z.object({
  identityToken: z.string(),
});

export async function storeHuddle01Credential(userId: number, identityToken: string) {
  const existingCredential = await prisma.credential.findFirst({
    where: {
      type: "huddle01_video",
      userId: userId,
      appId: "huddle01",
    },
  });

  if (existingCredential) {
    // Update the existing credential with the new identityToken
    await prisma.credential.update({
      where: { id: existingCredential.id },
      data: { key: { identityToken } },
    });
  } else {
    // Create a new credential if it doesn't exist
    await prisma.credential.create({
      data: {
        type: "huddle01_video",
        key: { identityToken },
        userId: userId,
        appId: "huddle01",
      },
    });
  }
}

export async function getHuddle01Credential(userId: number) {
  const credential = await prisma.credential.findFirst({
    where: {
      type: "huddle01_video",
      userId: userId,
      appId: "huddle01",
    },
  });

  if (!credential) {
    throw new Error("Huddle01 credential not found");
  }

  return huddle01AppKeySchema.parse(credential?.key);
}

const huddle01APIKeySchema = z.object({
  apiKey: z.string(),
});

export async function getHuddle01APIKey() {
  const appCreds = await prisma.app.findFirst({
    where: {
      slug: "huddle01",
    },
  });

  if (!appCreds) {
    throw new Error("Huddle01 app credential not found");
  }

  return huddle01APIKeySchema.parse(appCreds?.keys);
}
