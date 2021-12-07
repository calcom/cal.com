import { pick } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import { resizeBase64Image } from "@server/lib/resizeBase64Image";

import { getTranslation } from "../lib/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  const t = await getTranslation(req.body.language ?? "en", "common");

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const avatar = req.body.avatar ? await resizeBase64Image(req.body.avatar) : undefined;
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        ...pick(req.body, [
          "username",
          "name",
          "timeZone",
          "weekStart",
          "hideBranding",
          "theme",
          "completedOnboarding",
          "locale",
        ]),
        avatar,
        bio: req.body.description,
      },
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Username already taken" });
    }
    if (e.message.includes("Unsupported MIME type:")) {
      return res.status(422).json({
        message: t("unsupported_mime_type", {
          // The translation will escape the / in the mime type
          // soget only the image type and pass that
          // have image/ in the translation
          mime_type: e.message.replace("Unsupported MIME type: image/", ""),
        }),
      });
    }
    throw e;
  }

  return res.status(200).json({ message: "Profile updated successfully" });
}
