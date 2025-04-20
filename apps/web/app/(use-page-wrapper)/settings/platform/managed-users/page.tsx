import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/platform/managed-users/getServerSideProps";

import ManagedUsersView from "~/settings/platform/managed-users/managed-users-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/managed-users"
  );

const getData = withAppDirSsr(getServerSideProps);

const ServerPageWrapper = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(await headers(), await cookies(), await params, await searchParams));
  return <ManagedUsersView />;
};

export default ServerPageWrapper;
