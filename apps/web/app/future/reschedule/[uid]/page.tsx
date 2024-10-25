import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

const getData = withAppDirSsr(getServerSideProps);

const Page = async (props: PageProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, searchParams);

  await getData(legacyCtx);

  return null;
};

export default Page;
