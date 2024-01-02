import type { LayoutProps, PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

type WithLayoutParams<T> = {
  getLayout?: ((page: React.ReactElement) => JSX.Element) | null;
} & ( // If page accepts props, require getData
  | { Page: (props: T) => JSX.Element; getData: (arg: ReturnType<typeof buildLegacyCtx>) => Promise<T> }
  // If page does not accept props, allow getData to be optional
  | { Page?: () => JSX.Element; getData?: (arg: ReturnType<typeof buildLegacyCtx>) => Promise<T> }
);

export function WithLayout<T>({ getLayout, getData, Page }: WithLayoutParams<T>) {
  return async ({ params, ...restProps }: PageProps | LayoutProps) => {
    const h = headers();
    const nonce = h.get("x-nonce") ?? undefined;
    const props = getData ? await getData(buildLegacyCtx(h, cookies(), params)) : null;

    return (
      <PageWrapper
        getLayout={getLayout ?? null}
        requiresLicense={false}
        nonce={nonce}
        themeBasis={null}
        {...props}>
        {Page ? props ? <Page {...props} /> : <></> : "children" in restProps ? restProps.children : <></>}
      </PageWrapper>
    );
  };
}
