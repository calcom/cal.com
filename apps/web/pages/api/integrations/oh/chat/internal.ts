import type { NextApiResponse, NextApiRequest } from "next";
import { z } from "zod";

import { ONEHASH_API_KEY, ONEHASH_CHAT_ORIGIN } from "@calcom/lib/constants";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import prisma from "@calcom/prisma";

const postSchema = z.object({
  account_user_id: z.number(),
  cal_user_id: z.number(),
  status: z.boolean(),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { account_user_id, cal_user_id, status } = postSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        id: cal_user_id,
      },
      select: {
        metadata: true,
      },
    });

    if (!user) return res.status(404).json({ message: "Cal user not found" });
    if (status) {
      const response = await fetch(`${ONEHASH_CHAT_ORIGIN}/onehash/cal/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ONEHASH_API_KEY}`,
        },
        body: JSON.stringify({
          account_user_id,
          cal_user_id,
        }),
      });
      if (!response.ok) {
        if (response.status === 422) {
          const error = (await response.json()).error ?? "Internal Server Error";
          throw new Error(error);
        }
        throw new Error("Couldn't sync app with OneHash Chat");
      }
    }

    const existingMetadata = isPrismaObjOrUndefined(user?.metadata) ?? {};
    const chat_integration_requests =
      (existingMetadata?.chat_integration_requests as Array<{
        account_name: string;
        account_user_id: number;
        account_user_email: string;
      }>) ?? [];

    const updatedChatIntegrationRequests = chat_integration_requests.filter(
      (el) => el.account_user_id !== account_user_id
    );

    const updatedMetadata = {
      ...existingMetadata,
      chat_integration_requests: updatedChatIntegrationRequests,
    };

    await prisma.user.update({
      where: {
        id: cal_user_id,
      },
      data: {
        metadata: updatedMetadata,
      },
    });

    return res.json({ message: `${status ? "Integration Successful " : "Rejected "}` });
  } catch (e) {
    console.error("Error", e);
    throw e;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case "POST":
        return await postHandler(req, res);
      default:
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({ errors });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
