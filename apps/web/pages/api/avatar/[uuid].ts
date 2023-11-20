import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  uuid: z.string().transform((objectKey) => objectKey.split(".")[0]),
});

const handleValidationError = (res: NextApiResponse, error: z.ZodError): void => {
  const errors = error.errors.map((err) => ({
    path: err.path.join("."),
    errorCode: `error.validation.${err.code}`,
  }));

  res.status(400).json({
    message: "VALIDATION_ERROR",
    errors,
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return handleValidationError(res, result.error);
  }

  const { uuid: objectKey } = result.data;

  let img;
  try {
    const { data } = await prisma.avatar.findUniqueOrThrow({
      where: {
        objectKey,
      },
      select: {
        data: true,
      },
    });
    img = data;
  } catch (e) {
    // If anything goes wrong or avatar is not found, use default avatar
    res.writeHead(302, {
      Location: AVATAR_FALLBACK,
    });

    res.end();
    return;
  }

  const decoded = img.toString().replace("data:image/png;base64,", "").replace("data:image/jpeg;base64,", "");
  const imageResp = Buffer.from(decoded, "base64");

  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": imageResp.length,
  });

  res.end(imageResp);
}
