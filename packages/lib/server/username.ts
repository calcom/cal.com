import { Redis } from "@upstash/redis";
import type { NextApiRequest, NextApiResponse } from "next";

import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { IS_CALCOM } from "../constants";
import notEmpty from "../notEmpty";

const WORDLIST_PATH = process.env.PREMIUM_WORDLIST_PATH_FROM_SERVER ?? "";

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

async function fetchWordlist() {
  const UPSATCH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!WORDLIST_PATH || !UPSATCH_ENV_FOUND || !IS_CALCOM) {
    return {};
  }
  const redis = Redis.fromEnv();

  const cachedData = await redis.get("premium-username-word-list");

  if (cachedData) {
    return JSON.parse(cachedData as string);
  } else {
    const response = await fetch(WORDLIST_PATH);
    const data = await response.json();
    await redis.set("premium-username-word-list", JSON.stringify(data), {
      ex: 60 * 60 * 24 * 7,
    });

    return data;
  }
}

export const isPremiumUserName = async (username: string) => {
  const wordlist = await fetchWordlist();
  return username.length <= 4 || Object.prototype.hasOwnProperty.call(wordlist, username);
};

export const generateUsernameSuggestion = async (users: string[], username: string) => {
  const limit = username.length < 2 ? 9999 : 999;
  let rand = 1;
  while (users.includes(username + String(rand).padStart(4 - rand.toString().length, "0"))) {
    rand = Math.ceil(1 + Math.random() * (limit - 1));
  }
  return username + String(rand).padStart(4 - rand.toString().length, "0");
};

const usernameHandler =
  (handler: CustomNextApiHandler) =>
  async (req: RequestWithUsernameStatus, res: NextApiResponse): Promise<void> => {
    const username = slugify(req.body.username);
    // If we're not in Calcom, we don't need to check for premium usernames
    if (!IS_CALCOM) {
      req.usernameStatus = {
        statusCode: 200,
        requestedUserName: username,
        json: {
          available: true,
          premium: false,
          message: "Username is available",
        },
      };
      return handler(req, res);
    }

    const check = await usernameCheck(username);

    req.usernameStatus = {
      statusCode: 200,
      requestedUserName: username,
      json: {
        available: true,
        premium: false,
        message: "Username is available",
      },
    };

    if (check.premium) {
      req.usernameStatus.statusCode = 402;
      req.usernameStatus.json.premium = true;
      req.usernameStatus.json.message = "This is a premium username.";
    }

    if (!check.available) {
      req.usernameStatus.statusCode = 418;
      req.usernameStatus.json.available = false;
      req.usernameStatus.json.message = "A user exists with that username";
    }

    req.usernameStatus.json.suggestion = check.suggestedUsername;

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
