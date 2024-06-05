import LegacyPage from "@pages/d/[link]/[slug]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Params, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { symmetricEncrypt } from "@calcom/lib/crypto";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/d/[link]/[slug]/getServerSideProps";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const pageProps = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { entity, booking, user, slug, isTeamEvent } = pageProps;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc");
  const meQuery = trpc.viewer.me.useQuery();
  const token = encodeURIComponent(
    symmetricEncrypt(meQuery.data?.email || "Email-less", process.env.CALENDSO_ENCRYPTION_KEY || "")
  );
  const { data: event } = trpc.viewer.public.event.useQuery(
    {
      username: user ?? "",
      eventSlug: slug ?? "",
      isTeamEvent,
      org: entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
      token,
    },
    { refetchOnWindowFocus: false, enabled: !meQuery.isPending }
  );
  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};

const getData = withAppDirSsr(getServerSideProps);
export default WithLayout({ getLayout: null, Page: LegacyPage, getData })<"P">;
