// pages containing layout (e.g., /availability/[schedule].tsx) are supposed to go under (no-layout) folder
import { headers } from "next/headers";
import { type ReactElement } from "react";

import PageWrapper from "@components/PageWrapperAppDir";

type WrapperWithoutLayoutProps = {
  children: ReactElement;
  params: { [key: string]: any };
};

const handleGetProps = async (relativePath: string) => {
  const props = await import(`./${relativePath}`).then((mod) => mod.getProps?.() ?? null);
  return props;
};

export default async function WrapperWithoutLayout({ children, params }: WrapperWithoutLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const props = await handleGetProps(params.relativePath);

  return (
    <PageWrapper
      getLayout={(page) => page}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      {...props}>
      {children}
    </PageWrapper>
  );
}
