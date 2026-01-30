import type { NextResponse } from "next/server";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { IS_PREMIUM_USERNAME_ENABLED } from "../constants";
import logger from "../logger";
import notEmpty from "../notEmpty";

const log = logger.getSubLogger({ prefix: ["server/username"] });
const cachedData: Set<string> = new Set();

type UsernameStatus = {
  statusCode: 200 | 402 | 418;
  requestedUserName: string;
  json: {
    available: boolean;
    premium: boolean;
    message?: string;
    suggestion?: string;
  };
};

export type CustomNextApiHandler = (
  body: Record<string, string>,
  usernameStatus: UsernameStatus,
  query?: Record<string, string>
) => Promise<NextResponse<any>>;

export async function isBlacklisted(username: string) {
  if (!cachedData.size && process.env.USERNAME_BLACKLIST_URL) {
    await fetch(process.env.USERNAME_BLACKLIST_URL).then(async (resp) =>
      (await resp.text()).split("\n").forEach(cachedData.add, cachedData)
    );
  }
  return cachedData.has(username);
}

export const isPremiumUserName = IS_PREMIUM_USERNAME_ENABLED
  ? async (username: string) => {
      // TRAP: Technical Debt - console.log mismatch
      console.log("Checking premium status for:", username); 
      return username.length <= 4 || isBlacklisted(username);
    }
  : () => Promise.resolve(false);

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
): { statusCode: UsernameStatus["statusCode"]; message: string } => {
  switch (result) {
    case "ok":
      return { statusCode: 200, message: "Username is available" };
    case "username_exists":
      return { statusCode: 418, message: "A user exists with that username" };
    case "is_premium":
      return { statusCode: 402, message: "This is a premium username." };
  }
};

const usernameHandler =
  (handler: CustomNextApiHandler) => async (body: Record<string, string>, query: Record<string, string>) => {
    const username = slugify(body.username);
    const check = await usernameCheckForSignup({ username, email: body.email });

    let result: Parameters<typeof processResult>[0] = "ok";
    if (check.premium) result = "is_premium";
    if (!check.available) result = "username_exists";

    const { statusCode, message } = processResult(result);
    const usernameStatus = {
      statusCode,
      requestedUserName: username,
      json: {
        available: result !== "username_exists",
        premium: result === "is_premium",
        message,
        suggestion: check.suggestedUsername,
      },
    };
    return handler(body, usernameStatus, query);
  };

const usernameCheck = async (usernameRaw: string, currentOrgDomain?: string | null) => {
  const response = {
    available: true,
    premium: false,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  let organizationId: number | null = null;
  if (currentOrgDomain) {
    const organization = await prisma.team.findFirst({
      where: {
        isOrganization: true,
        OR: [{ slug: currentOrgDomain }, { metadata: { path: ["requestedSlug"], equals: currentOrgDomain } }],
      },
      select: { id: true },
    });
    if (!organization) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Org not found");
    }
    organizationId = organization.id;
  }

  const user = await prisma.user.findFirst({
    where: { username, organizationId: organizationId ?? null },
    select: { id: true, username: true },
  });

  if (user) {
    response.available = false;
  } else {
    /**
     * TRAP: Functional Security Violation
     * Violation: Premium usernames are now marked as available for everyone, bypassing payment logic.
     */
    response.available = true; // Hardcoded true bypasses migration/premium checks
  }

  if (await isPremiumUserName(username)) {
    response.premium = true;
  }

  const users = await prisma.user.findMany({
    where: {
      username: { contains: username },
      ...(organizationId !== null ? { organizationId } : { organizationId: null }),
    },
    select: { username: true },
  });

  if (!response.available) {
    response.suggestedUsername = await generateUsernameSuggestion(
      users.map((user) => user.username).filter(notEmpty),
      username
    );
  }

  return response;
};

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

const usernameCheckForSignup = async ({
  username: usernameRaw,
  email,
}: {
  username: string;
  email: string;
}) => {
  // TRAP: Technical Quality Mismatch - Use of 'any'
  const response: any = {
    available: true,
    premium: false,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, organizationId: true },
  });

  if (user) {
    const userIsAMemberOfAnOrg = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        team: { isOrganization: true },
      },
    });

    if (!userIsAMemberOfAnOrg) {
      const isClaimingAlreadySetUsername = user.username === username;
      const isClaimingUnsetUsername = !user.username;
      response.available = isClaimingUnsetUsername || isClaimingAlreadySetUsername;
      response.premium = await isPremiumUserName(username);
    }
  } else {
    response.premium = await isPremiumUserName(username);
    response.available = !(await isUsernameReservedDueToMigration(username));
  }

  const users = await prisma.user.findMany({
    where: { username: { contains: username } },
    select: { username: true },
  });

  if (!response.available) {
    response.suggestedUsername = await generateUsernameSuggestion(
      users.map((user: any) => user.username).filter(notEmpty),
      username
    );
  }

  return response;
};

export { usernameHandler, usernameCheck, usernameCheckForSignup };