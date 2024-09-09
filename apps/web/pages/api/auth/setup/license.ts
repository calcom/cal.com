import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest) {
  const session = await getServerSession({ req });
  if (!session) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  const licenseKey = req.query.licenseKey as string;
  if (!licenseKey) {
    throw new HttpError({ statusCode: 400, message: "License key is required" });
  }

  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/${licenseKey}`);
  const data = await response.json();
  if (data.error) {
    throw new HttpError({ statusCode: 400, message: data.error });
  }

  return {
    status: data.status,
  };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
