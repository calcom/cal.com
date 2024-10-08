import type { NextApiRequest } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

async function checkLicenseKey(licenseKey: string) {
  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/${licenseKey}`);
  const data = await response.json();
  if (data.error) {
    throw new HttpError({ statusCode: 400, message: data.error });
  }

  const licenseSchema = z.object({
    status: z.boolean(),
  });
  return licenseSchema.parse(data);
}

async function saveLicenseKeyToDeployment(licenseKey: string) {
  await prisma.deployment.upsert({
    where: { id: 1 },
    update: {
      licenseKey,
      agreedLicenseAt: new Date(),
    },
    create: {
      licenseKey,
      agreedLicenseAt: new Date(),
    },
  });
}

async function handler(req: NextApiRequest) {
  const session = await getServerSession({ req });
  if (!session) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  const licenseKey = req.query.licenseKey as string;
  if (!licenseKey) {
    throw new HttpError({ statusCode: 400, message: "License key is required" });
  }

  const response = await checkLicenseKey(licenseKey);
  await saveLicenseKeyToDeployment(licenseKey);

  return {
    status: response.status,
  };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
