import type { Prisma } from "@prisma/client";
import fetch from "node-fetch";

import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";
import { uploadAvatar } from "@calcom/trpc/server/routers/loggedInViewer/updateProfile.handler";

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
  const user = await prisma.user.findFirst({
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

  const response = await fetch("https://avatarapi.com/v2/api.aspx", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: JSON.stringify({
      username: process.env.AVATARAPI_USERNAME,
      password: process.env.AVATARAPI_PASSWORD,
      email: email,
    }),
  });

  const info = await response.json();

  if (!info.Success) {
    console.log("Error from avatar api: ", info.Error);
    return null;
  }

  return info.Image as string;
};
