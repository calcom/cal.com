import LegacyPage from "@pages/settings/admin/oAuth/index";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";
import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth",
    () => "Add new OAuth Clients"
  );

export default async function Page() {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
}
