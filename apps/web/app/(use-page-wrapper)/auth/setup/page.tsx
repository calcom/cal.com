import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/setup/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PageProps as ClientPageProps } from "~/auth/setup-view";
import Setup from "~/auth/setup-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("setup"),
    (t) => t("setup_description"),
    undefined,
    undefined,
    "/auth/setup"
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);
const stepSchema = z.enum(["1", "2", "3", "4"]);

const ServerPage = async ({ params, searchParams: _searchParams }: ServerPageProps) => {
  const searchParams = await _searchParams;
  const stepResult = stepSchema.safeParse(searchParams?.step);

  // If step parameter is invalid, redirect to step 1
  if (!stepResult.success) {
    return redirect(`/auth/setup?step=1`);
  }

  const props = await getData(buildLegacyCtx(await headers(), await cookies(), await params, searchParams));
  return <Setup {...props} />;
};

export default ServerPage;
