import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/video/meeting-ended/[uid]/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/videos/views/videos-meeting-ended-single-view";
import MeetingEnded from "~/videos/views/videos-meeting-ended-single-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("meeting_unavailable"),
    (t) => t("meeting_unavailable")
  );

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(context);
  return <MeetingEnded {...props} />;
};

export default ServerPage;
