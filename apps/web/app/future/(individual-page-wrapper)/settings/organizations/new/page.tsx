import OldPage from "@pages/settings/organizations/new/index";
import { _generateMetadata } from "app/_utils";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

type PageProps = Readonly<{
  params: Params;
}>;

const Page = async ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  const props = await getData(legacyCtx);

  return (
    <PageWrapper requiresLicense={false} nonce={nonce} themeBasis={null}>
      <OldPage {...props} />
    </PageWrapper>
  );
};

export default Page;
