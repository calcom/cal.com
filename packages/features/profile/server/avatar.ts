import { z } from "zod";

import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";

const base64Image = z.custom<string>((val: unknown) => {
  return typeof val === "string" ? /^data:image\/png;base64,/.test(val) : false;
});

// either a data:image/png;base64,<base64> or a URL
export const avatarSchema = z.union([z.string().url(), base64Image]).nullable();

export async function uploadAvatar(
  userId: number,
  avatar?: string | null
): Promise<[string, string] | undefined> {
  const result = base64Image.safeParse(avatar);
  if (!result.success) return;

  const resizedAvatar = await resizeBase64Image(result.data);

  // At this point we write the avatar to the images
  const { id } = await prisma.image.upsert({
    where: {
      reference: `user_avatar:${userId}`,
    },
    create: {
      reference: `user_avatar:${userId}`,
      data: resizedAvatar,
    },
    update: {
      data: resizedAvatar,
    },
  });

  return [`/api/avatar/${id}.png`, resizedAvatar];
}
