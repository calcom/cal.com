import type { LayoutProps, PageProps } from "app/_types";
import { type GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

type WithLayoutParams<T extends Record<string, any>> = {
  getLayout: ((page: React.ReactElement) => React.ReactNode) | null;
  Page?: (props: T) => React.ReactElement | null;
  getData?: (arg: GetServerSidePropsContext) => Promise<T>;
  isBookingPage?: boolean;
};

export function WithLayout<T extends Record<string, any>>({
  getLayout,
  getData,
  Page,
  isBookingPage,
}: WithLayoutParams<T>) {
  return async <P extends "P" | "L">(p: P extends "P" ? PageProps : LayoutProps) => {
    const h = headers();
    const nonce = h.get("x-nonce") ?? undefined;
    const props = getData
      ? await getData(buildLegacyCtx(h, cookies(), p.params) as unknown as GetServerSidePropsContext)
      : ({} as T);

    const children = "children" in p ? p.children : null;

    return (
      <PageWrapper
        getLayout={getLayout}
        requiresLicense={false}
        nonce={nonce}
        themeBasis={null}
        isBookingPage={isBookingPage}
        {...props}>
        {Page ? <Page {...props} /> : children}
      </PageWrapper>
    );
  };
}
