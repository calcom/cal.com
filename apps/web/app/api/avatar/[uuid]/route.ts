import type { Params } from "app/_types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AVATAR_FALLBACK, WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  uuid: z.string().transform((objectKey) => objectKey.split(".")[0]),
});

const handleValidationError = (error: z.ZodError): NextResponse => {
  const errors = error.errors.map((err) => ({
    path: err.path.join("."),
    errorCode: `error.validation.${err.code}`,
  }));

  return NextResponse.json(
    {
      message: "VALIDATION_ERROR",
      errors,
    },
    { status: 400 }
  );
};

async function handler(req: NextRequest, { params }: { params: Params }) {
  const result = querySchema.safeParse(params);
  if (!result.success) {
    return handleValidationError(result.error);
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
    const url = new URL(AVATAR_FALLBACK, WEBAPP_URL).toString();
    return NextResponse.redirect(url, 302);
  }

  const decoded = img.toString().replace("data:image/png;base64,", "").replace("data:image/jpeg;base64,", "");
  const imageResp = Buffer.from(decoded, "base64");

  return new NextResponse(imageResp, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": imageResp.length.toString(),
      "Cache-Control": "max-age=86400",
    },
    status: 200,
  });
}

export const GET = defaultResponderForAppDir(handler);
