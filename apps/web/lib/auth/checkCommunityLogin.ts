/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { UserPermissionRole } from "@prisma/client";
import crypto from "crypto";
import type { User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { CredentialInput } from "next-auth/providers/credentials";

import { COMMUNITY_URL, WEBAPP_URL, WEBSITE_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";

const communityLoginChecker = (secret: string) => {
  const utils = {
    getHmac: () => {
      return crypto.createHmac("sha256", secret);
    },
  };

  return {
    validate: (payload: string, sig: string) => {
      const hmac = utils.getHmac();
      hmac.update(decodeURIComponent(payload));
      if (hmac.digest("hex") === sig) {
        return true;
      } else {
        return false;
      }
    },
    getNonce: (payload: string): string => {
      const q = new URLSearchParams(Buffer.from(decodeURIComponent(payload), "base64").toString());
      const nonce = q.get("nonce");
      if (nonce) {
        return nonce;
      } else {
        throw new Error("Missing nonce");
      }
    },
    getLoginString: (params: string[][] | Record<string, string> | string | URLSearchParams) => {
      const payload = Buffer.from(new URLSearchParams(params).toString(), "utf8").toString("base64");
      const hmac = utils.getHmac();
      hmac.update(payload);
      return (
        "?" +
        new URLSearchParams({
          sso: payload,
          sig: hmac.digest("hex"),
        }).toString()
      );
    },
  };
};

const checkCommunityLogin = (
  user: User | AdapterUser,
  credentials: Record<string, CredentialInput> | undefined
): string | boolean => {
  if (IS_SELF_HOSTED) return true;
  if (!credentials?.callbackUrl) return true;
  const callbackUrl = new URL(credentials.callbackUrl as string);
  if (callbackUrl.hostname !== new URL(COMMUNITY_URL).hostname) return true;
  if (!process.env.COMMUNITY_SECRET) return "/auth/error?error=invalid-community-login";
  const params = new URLSearchParams(callbackUrl.searchParams);
  const ssoParam = params.get("sso");
  const sigParam = params.get("sig");
  if (ssoParam === null || sigParam === null) return "/auth/error?error=invalid-community-login";
  const sso = communityLoginChecker(process.env.COMMUNITY_SECRET);
  if (!sso.validate(ssoParam, sigParam)) return "/auth/error?error=invalid-community-login";
  const nonce = sso.getNonce(ssoParam);
  const userparams = {
    // Required, will throw exception otherwise
    nonce: nonce,
    external_id: user.id.toString(),
    email: user.email!,
    // Optional
    admin: user.role === UserPermissionRole.ADMIN ? "true" : "false",
    username: user.username!,
    name: user.name!,
    bio: user.bio ?? "",
    avatar_force_update: "true",
    avatar_url: `${WEBAPP_URL}/${user.username}/avatar.png`,
    website: `${WEBSITE_URL}/${user.username}`,
  };
  const q = sso.getLoginString(userparams);
  return `https://cal.community/session/sso_login${q}`;
};

export default checkCommunityLogin;
