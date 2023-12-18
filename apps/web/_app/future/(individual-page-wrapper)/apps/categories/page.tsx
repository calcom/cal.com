import LegacyPage from "@pages/apps/categories/index";
import { ssrInit } from "_app/_trpc/ssrInit";
import { _generateMetadata } from "_app/_utils";
import { cookies, headers } from "next/headers";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Categories | ${APP_NAME}`,
    () => ""
  );
};

async function getPageProps() {
  const ssr = await ssrInit();
  const req = { headers: headers(), cookies: cookies() };

  // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest | IncomingMessage
  const session = await getServerSession({ req });

  let appStore;
  if (session?.user?.id) {
    appStore = await getAppRegistryWithCredentials(session.user.id);
  } else {
    appStore = await getAppRegistry();
  }

  const categories = appStore.reduce((c, app) => {
    for (const category of app.categories) {
      c[category] = c[category] ? c[category] + 1 : 1;
    }
    return c;
  }, {} as Record<string, number>);

  return {
    categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
    dehydratedState: await ssr.dehydrate(),
  };
}

export default async function Page() {
  const props = await getPageProps();
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <LegacyPage {...props} />
    </PageWrapper>
  );
}
