import { EmbedErrorClient } from "./embed-error-client";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { isRedirectUriRegistered } from "@calcom/features/oauth/utils/validateRedirectUris";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SearchParams } from "app/_types";

const EmbedPage = async ({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const searchParams = await searchParamsPromise;
  const oAuthClientId = searchParams?.client_id as string | undefined;
  const redirectUri = searchParams?.redirect_uri as string | undefined;

  const oAuthClientRepo = new OAuthClientRepository(prisma);
  const oAuthClient = oAuthClientId ? await oAuthClientRepo.findByClientId(oAuthClientId) : null;

  if (!oAuthClient) {
    return (
      <EmbedErrorClient
      code="INVALID_PROPS"
      message="The oAuthClientId passed to <OnboardingEmbed /> is invalid or does not exist"
      redirectUri={redirectUri}
      />
    );
  }

  if (!redirectUri || !isRedirectUriRegistered(redirectUri, oAuthClient.redirectUris)) {
    return (
      <EmbedErrorClient
        code="INVALID_PROPS"
        message="The redirectUri passed to <OnboardingEmbed /> authorization does not match any registered redirect URI for this OAuth client"
        redirectUri={redirectUri}
      />
    );
  }

  const headersList = await headers();
  const session = await getServerSession({ req: buildLegacyRequest(headersList, await cookies()) });
  const queryString = toQueryString(searchParams);

  if (!session?.user?.id) {
    return redirectToLogin(queryString);
  }

  const userRepo = new UserRepository(prisma);
  const user = await userRepo.findById({ id: session.user.id });

  if (!user?.completedOnboarding) {
    return redirectToOnboarding(queryString);
  }

  return redirectToAuthorize(queryString);
};

function redirectToLogin(queryString: string) {
  const callbackUrl = encodeURIComponent(`/onboarding/getting-started/embed?${queryString}`);
  return redirect(`/auth/login?${queryString}&callbackUrl=${callbackUrl}`);
}

function redirectToOnboarding(queryString: string) {
  return redirect(`/onboarding/personal/settings?${queryString}`);
}

function redirectToAuthorize(queryString: string) {
  return redirect(`/auth/oauth2/authorize?${queryString}`);
}

function toQueryString(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") query.set(key, value);
  }
  return query.toString();
}

export default EmbedPage;
