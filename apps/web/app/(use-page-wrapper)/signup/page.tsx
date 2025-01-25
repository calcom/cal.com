import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/signup/getServerSideProps";

import type { SignupProps } from "~/signup-view";
import Signup from "~/signup-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sign_up"),
    (t) => t("sign_up")
  );

const getData = withAppDirSsr<SignupProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(context);
  return <Signup {...props} />;
};

export default ServerPage;
