import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getSlackAppKeys } from "../lib/utils";

const scopes = ["commands", "users:read", "users:read.email", "chat:write", "chat:write.public"];

async function handler(req: NextApiRequest) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const { client_id } = await getSlackAppKeys();
  // Get user
  await prisma.user.findFirst({
    rejectOnNotFound: true,
    where: {
      id: req.session.user.id,
    },
    select: {
      id: true,
    },
  });
  const params = {
    client_id,
    scope: scopes.join(","),
  };
  const query = stringify(params);
  const url = `https://slack.com/oauth/v2/authorize?${query}&user_`;
  // const url =
  //   "https://slack.com/oauth/v2/authorize?client_id=3194129032064.3178385871204&scope=chat:write,commands&user_scope=";
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
