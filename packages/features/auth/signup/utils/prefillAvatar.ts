import fetch from "node-fetch";

import { uploadAvatar } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

interface IPrefillAvatar {
  email: string;
}

async function downloadImageDataFromUrl(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log("Error fetching image from: ", url);
      return null;
    }

    const imageBuffer = await response.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    return base64Image;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const prefillAvatar = async ({ email }: IPrefillAvatar) => {
  const imageUrl = await getImageUrlAvatarAPI(email);
  if (!imageUrl) return;

  const base64Image = await downloadImageDataFromUrl(imageUrl);
  if (!base64Image) return;

  const avatar = await resizeBase64Image(base64Image);
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return;
  }
  const avatarUrl = await uploadAvatar({ userId: user.id, avatar });

  const data: Prisma.UserUpdateInput = {};
  data.avatarUrl = avatarUrl;

  await prisma.user.update({
    where: { email: email },
    data,
  });
};

const getImageUrlAvatarAPI = async (email: string) => {
  if (!process.env.AVATARAPI_USERNAME || !process.env.AVATARAPI_PASSWORD) {
    console.info("No avatar api credentials found");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://avatarapi.com/v2/api.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        username: process.env.AVATARAPI_USERNAME,
        password: process.env.AVATARAPI_PASSWORD,
        email,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const info = await response.json();

    if (!info.Success) {
      if (info.Error === "Not found") {
        // Expected case: no avatar for this email
        return null;
      }
      console.warn("Avatar API error:", info.Error);
      return null;
    }
    return info.Image as string;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("Avatar API request timed out");
    } else {
      console.error("Avatar API request failed:", error);
    }
    return null;
  }
};
