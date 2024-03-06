import type { NextApiRequest, NextApiResponse } from "next";

import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { IS_PREMIUM_USERNAME_ENABLED } from "../constants";
import logger from "../logger";
import notEmpty from "../notEmpty";

const log = logger.getSubLogger({ prefix: ["server/username"] });
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
    const check = await usernameCheckForSignup({ username, email: req.body.email });

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

const usernameCheck = async (usernameRaw: string, currentOrgDomain?: string | null) => {
  log.debug("usernameCheck", { usernameRaw, currentOrgDomain });
  const isCheckingUsernameInGlobalNamespace = !currentOrgDomain;
  const response = {
    available: true,
    premium: false,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  const user = await prisma.user.findFirst({
    where: {
      username,
      // Simply remove it when we drop organizationId column
      organizationId: null,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (user) {
    response.available = false;
  } else {
    response.available = isCheckingUsernameInGlobalNamespace
      ? !(await isUsernameReservedDueToMigration(username))
      : true;
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

/**
 * Should be used when in global namespace(i.e. outside of an organization)
 */
export const isUsernameReservedDueToMigration = async (username: string) =>
  !!(await prisma.tempOrgRedirect.findUnique({
    where: {
      from_type_fromOrgId: {
        type: RedirectType.User,
        from: username,
        fromOrgId: 0,
      },
    },
  }));

/**
 * It is a bit different from usernameCheck because it also check if the user signing up is the same user that has a pending invitation to organization
 * So, it uses email to uniquely identify the user and then also checks if the username requested by that user is available for taking or not.
 * TODO: We should reuse `usernameCheck` and then do the additional thing in here.
 */
const usernameCheckForSignup = async ({
  username: usernameRaw,
  email,
}: {
  username: string;
  email: string;
}) => {
  const response = {
    available: true,
    premium: false,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      username: true,
      organizationId: true,
    },
  });

  if (user) {
    // TODO: When supporting multiple profiles of a user, we would need to check if the user has a membership with the correct organization
    const userIsAMemberOfAnOrg = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        team: {
          isOrganization: true,
        },
      },
    });

    // When we invite an email, that doesn't match the orgAutoAcceptEmail, we create a user with organizationId=null.
    // The only way to differentiate b/w 'a new email that was invited to an Org' and 'a user that was created using regular signup' is to check if the user is a member of an org.
    // If username is in global namespace
    if (!userIsAMemberOfAnOrg) {
      const isClaimingAlreadySetUsername = user.username === username;
      const isClaimingUnsetUsername = !user.username;
      response.available = isClaimingUnsetUsername || isClaimingAlreadySetUsername;
      // There are premium users outside an organization only
      response.premium = await isPremiumUserName(username);
    }
    // If user isn't found, it's a direct signup and that can't be of an organization
  } else {
    response.premium = await isPremiumUserName(username);
    response.available = !(await isUsernameReservedDueToMigration(username));
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

export { usernameHandler, usernameCheck, usernameCheckForSignup };
