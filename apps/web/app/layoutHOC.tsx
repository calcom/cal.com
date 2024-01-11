import type { LayoutProps, PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

type WithLayoutParams<T extends Record<string, any>> = {
  getLayout: ((page: React.ReactElement) => React.ReactNode) | null;
  Page?: (props: T) => React.ReactElement | null;
  getData?: (arg: ReturnType<typeof buildLegacyCtx>) => Promise<T>;
};

export function WithLayout<T extends Record<string, any>>({ getLayout, getData, Page }: WithLayoutParams<T>) {
  return async <P extends "P" | "L">(p: P extends "P" ? PageProps : LayoutProps) => {
    const h = headers();
    const nonce = h.get("x-nonce") ?? undefined;
    const props = getData ? await getData(buildLegacyCtx(h, cookies(), p.params)) : ({} as T);

    const children = "children" in p ? p.children : null;

    return (
      <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
        {Page ? <Page {...props} /> : children}
      </PageWrapper>
    );
  };
}
