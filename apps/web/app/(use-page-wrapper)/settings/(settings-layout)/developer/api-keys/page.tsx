import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { PrismaApiKeyRepository } from "@calcom/lib/server/repository/PrismaApiKeyRepository";

import { buildLegacyHeaders, buildLegacyCookies } from "@lib/buildLegacyCtx";

import ApiKeysView from "~/settings/developer/api-keys-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/api-keys"
  );

const getCachedApiKeys = unstable_cache(
  async (userId: number) => {
    return await PrismaApiKeyRepository.findApiKeysFromUserId({ userId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.apiKeys.list"] } // Cache for 1 hour
);

const Page = async () => {
  const req = {
    headers: buildLegacyHeaders(await headers()),
    cookies: buildLegacyCookies(await cookies()),
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/developer/api-keys");
  }

  const userId = session.user.id;
  const apiKeys = await getCachedApiKeys(userId);

  return <ApiKeysView apiKeys={apiKeys} />;
};

export default Page;
