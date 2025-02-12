import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/d/[link]/[slug]/getServerSideProps";
import { type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

import Type from "~/d/[link]/d-type-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const pageProps = await getData(legacyCtx);

  const { booking, eventData, isBrandingHidden } = pageProps;
  const rescheduleUid = booking?.uid;

  const profileName = eventData?.profile?.name ?? "";
  const title = eventData?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const pageProps = await getData(legacyCtx);

  return <Type {...pageProps} />;
};

export default ServerPage;
