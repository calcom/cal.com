import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getSlackAppKeys } from "../lib/utils";

const callbackQuerySchema = z.object({
  code: z.string().min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  // Get user
  const parsedCallbackQuery = callbackQuerySchema.safeParse(req.query);

  if (!parsedCallbackQuery.success) {
    return res.redirect("/apps/installed"); // Redirect to where the user was if they cancel the signup or if the oauth fails
  }

  const { code } = parsedCallbackQuery.data;
  const { client_id, client_secret } = await getSlackAppKeys();

  const query = {
    client_secret,
    client_id,
    code,
  };
  const params = stringify(query);
  const url = `https://slack.com/api/oauth.v2.access?${params}`;
  const result = await fetch(url);
  const responseBody = await result.json();

  await prisma.user.update({
    where: {
      id: req.session.user.id,
    },
    data: {
      credentials: {
        create: {
          type: "slack_app",
          key: responseBody,
          appId: "slack",
        },
      },
    },
  });

  return res.redirect("/apps/installed");
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
