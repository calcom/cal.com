import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";

async function handler(req: NextApiRequest) {
  const session = await getServerSession({ req });
  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  if (req.method !== "POST") {
    throw new HttpError({ statusCode: 405, message: "Method not allowed" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    throw new HttpError({ statusCode: 404, message: "User not found" });
  }

  if (!user.trialEndsAt) {
    throw new HttpError({ statusCode: 400, message: "User is not on a trial" });
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      trialEndsAt: null,
    },
  });

  return { success: true };
}

export default defaultResponder(handler, "/api/stripe/skip-trial");
