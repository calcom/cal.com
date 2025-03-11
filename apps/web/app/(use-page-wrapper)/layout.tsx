import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export default async function PageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper requiresLicense={false} nonce={nonce}>
      {children}
    </PageWrapper>
  );
}
