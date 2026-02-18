import { AvatarApiService } from "@calcom/features/avatars/services/AvatarApiService";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import fetch from "node-fetch";

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
  const service = AvatarApiService.fromEnv();
  if (!service) return;

  const imageUrl = await service.getImageUrl(email);
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
