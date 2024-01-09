import OldPage, { getServerSideProps as _getServerSideProps } from "@pages/reschedule/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

type PageProps = Readonly<{
  params: Params;
}>;

const getData = withAppDirSsr(_getServerSideProps);

const Page = async ({ params }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);

  await getData(legacyCtx);

  return <OldPage />;
};

export default Page;
