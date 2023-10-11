import getInstalledAppPath from "_utils/getInstalledAppPath";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";
import { z } from "zod";

import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import config from "../config.json";

const createCredentials = async (userId: number, merchantIdInPayPal: string) => {
  const appType = config.type;
  const credentials = await prisma.credential.create({
    data: {
      type: appType,
      key: { merchantIdInPayPal },
      userId: userId,
      appId: "paypal",
    },
  });

  if (!credentials) {
    throw new Error("Unable to create user credential for Paypal");
  }
};

const queryParametersSchema = z.object({
  merchantId: z.string(),
  merchantIdInPayPal: z.string(),
  permissionsGranted: z.coerce.boolean(),
  accountStatus: z.string().optional(),
  consentStatus: z.coerce.boolean(),
  productIntentId: z.string(),
  isEmailConfirmed: z.coerce.boolean(),
  returnMessage: z.string().optional(),
  riskStatus: z.string().optional(),
});

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const { merchantIdInPayPal, permissionsGranted } = queryParametersSchema.parse(req.query);
    if (!permissionsGranted && !merchantIdInPayPal) {
      const query = stringify({
        error: "Paypal Onboarding Error",
        error_description: "Paypal Onboarding was not fully completed",
      });
      res.redirect(`/apps/installed?${query}`);
    }
    await createCredentials(req.session?.user.id, merchantIdInPayPal);
    return res.status(200).json({ url: getInstalledAppPath({ variant: "payment", slug: "paypal" }) });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: getHandler }),
});
