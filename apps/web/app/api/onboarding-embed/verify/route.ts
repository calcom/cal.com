import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { isRedirectUriRegistered } from "@calcom/features/oauth/utils/validateRedirectUris";
import prisma from "@calcom/prisma";

import { buildOnboardingEmbedVerifiedCookie } from "@lib/onboarding-embed-verified-cookie";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");

  const oAuthClientRepo = new OAuthClientRepository(prisma);
  const oAuthClient = clientId ? await oAuthClientRepo.findByClientId(clientId) : null;

  if (!oAuthClient) {
    return redirectToEmbed(req);
  }

  if (!redirectUri || !isRedirectUriRegistered(redirectUri, oAuthClient.redirectUris)) {
    return redirectToEmbed(req);
  }

  let redirectUriOrigin: string;
  try {
    redirectUriOrigin = new URL(redirectUri).origin;
  } catch {
    return redirectToEmbed(req);
  }

  const cookie = await buildOnboardingEmbedVerifiedCookie(redirectUriOrigin);
  const res = NextResponse.redirect(buildEmbedUrl(req));
  res.headers.append(
    "Set-Cookie",
    `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; HttpOnly; Secure; SameSite=None`
  );

  return res;
}

function buildEmbedUrl(req: NextRequest): URL {
  const embedUrl = new URL("/onboarding/getting-started/embed", req.nextUrl.origin);
  req.nextUrl.searchParams.forEach((value, key) => embedUrl.searchParams.set(key, value));
  return embedUrl;
}

function redirectToEmbed(req: NextRequest) {
  return NextResponse.redirect(buildEmbedUrl(req));
}
