import type { NextApiRequest, NextApiResponse } from "next";

import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { IS_PREMIUM_USERNAME_ENABLED } from "../constants";
import notEmpty from "../notEmpty";

const cachedData: Set<string> = new Set();

export type RequestWithUsernameStatus = NextApiRequest & {
  usernameStatus: {
    /**
     * ```text
     * 200: Username is available
     * 402: Pro username, must be purchased
     * 418: A user exists with that username
     * ```
     */
    statusCode: 200 | 402 | 418;
    requestedUserName: string;
    json: {
      available: boolean;
      premium: boolean;
      message?: string;
      suggestion?: string;
    };
  };
};

type CustomNextApiHandler<T = unknown> = (
  req: RequestWithUsernameStatus,
  res: NextApiResponse<T>
) => void | Promise<void>;

export async function isBlacklisted(username: string) {
  // NodeJS forEach is very, very fast (these days) so even though we only have to construct the Set
  // once every few iterations, it doesn't add much overhead.
  if (!cachedData.size && process.env.USERNAME_BLACKLIST_URL) {
    await fetch(process.env.USERNAME_BLACKLIST_URL).then(async (resp) =>
      (await resp.text()).split("\n").forEach(cachedData.add, cachedData)
    );
  }
  return cachedData.has(username);
}

export const isPremiumUserName = IS_PREMIUM_USERNAME_ENABLED
  ? async (username: string) => {
      return username.length <= 4 || isBlacklisted(username);
    }
  : // outside of cal.com the concept of premium username needs not exist.
    () => Promise.resolve(false);

export const generateUsernameSuggestion = async (users: string[], username: string) => {
  const limit = username.length < 2 ? 9999 : 999;
  let rand = 1;
  while (users.includes(username + String(rand).padStart(4 - rand.toString().length, "0"))) {
    rand = Math.ceil(1 + Math.random() * (limit - 1));
  }
  return username + String(rand).padStart(4 - rand.toString().length, "0");
};

const processResult = (
  result: "ok" | "username_exists" | "is_premium"
): // explicitly assign return value to ensure statusCode is typehinted
{ statusCode: RequestWithUsernameStatus["usernameStatus"]["statusCode"]; message: string } => {
  // using a switch statement instead of multiple ifs to make sure typescript knows
  // there is only limited options
  switch (result) {
    case "ok":
      return {
        statusCode: 200,
        message: "Username is available",
      };
    case "username_exists":
      return {
        statusCode: 418,
        message: "A user exists with that username",
      };
    case "is_premium":
      return { statusCode: 402, message: "This is a premium username." };
  }
};

const usernameHandler =
  (handler: CustomNextApiHandler) =>
  async (req: RequestWithUsernameStatus, res: NextApiResponse): Promise<void> => {
    const username = slugify(req.body.username);
    const check = await usernameCheck(username);

    let result: Parameters<typeof processResult>[0] = "ok";
    if (check.premium) result = "is_premium";
    if (!check.available) result = "username_exists";

    const { statusCode, message } = processResult(result);
    req.usernameStatus = {
      statusCode,
      requestedUserName: username,
      json: {
        available: result !== "username_exists",
        premium: result === "is_premium",
        message,
        suggestion: check.suggestedUsername,
      },
    };
    return handler(req, res);
  };

const usernameCheck = async (usernameRaw: string) => {
  const response = {
    available: true,
    premium: false,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  const user = await prisma.user.findFirst({
    where: { username, organizationId: null },
    select: {
      username: true,
    },
  });

  if (user) {
    response.available = false;
  }

  if (await isPremiumUserName(username)) {
    response.premium = true;
  }

  // get list of similar usernames in the db
  const users = await prisma.user.findMany({
    where: {
      username: {
        contains: username,
      },
    },
    select: {
      username: true,
    },
  });

  // We only need suggestedUsername if the username is not available
  if (!response.available) {
    response.suggestedUsername = await generateUsernameSuggestion(
      users.map((user) => user.username).filter(notEmpty),
      username
    );
  }

  return response;
};

export { usernameHandler, usernameCheck };
