import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { parse } from "cookie-es";
import { DateTime } from "luxon";

import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TRPCContextInner } from "../../../createContext";
import { getAuthenticatorRegistrationOptions } from "./util";

type createSignInOptions = {
  ctx: TRPCContextInner;
};
export const createSignInOptionsHandler = async ({ ctx }: createSignInOptions) => {
  const cookies = parse(ctx.req?.headers.cookie ?? "");

  const sessionIdToken = cookies["__Host-next-auth.csrf-token"] || cookies["next-auth.csrf-token"];
  if (!sessionIdToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Missing CSRF token",
    });
  }
  const [sessionId] = decodeURI(sessionIdToken).split("|");
  try {
    const { rpId, timeout } = getAuthenticatorRegistrationOptions();
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "preferred",
      timeout,
    });

    const { challenge } = options;

    await prisma.passkeyVerificationToken.upsert({
      where: {
        id: sessionId,
      },
      update: {
        token: challenge,
        expiresAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
        createdAt: new Date(),
      },
      create: {
        id: sessionId,
        token: challenge,
        expiresAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
        createdAt: new Date(),
      },
    });

    return options;
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to create the options for passkey signin. Please try again later.",
    });
  }
};
