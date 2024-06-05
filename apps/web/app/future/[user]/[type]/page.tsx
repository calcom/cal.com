import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { symmetricEncrypt } from "@calcom/lib/crypto";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage from "~/users/views/users-type-public-view";
import { getServerSideProps, type PageProps } from "~/users/views/users-type-public-view.getServerSideProps";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const props = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams) as unknown as GetServerSidePropsContext
  );

  const { eventData, booking, user, slug } = props;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc");
  const meQuery = trpc.viewer.me.useQuery();
  const token = encodeURIComponent(
    symmetricEncrypt(meQuery.data?.email || "Email-less", process.env.CALENDSO_ENCRYPTION_KEY || "")
  );
  const { data: event } = trpc.viewer.public.event.useQuery(
    {
      username: user,
      eventSlug: slug,
      isTeamEvent: false,
      org: eventData.entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: eventData.entity.fromRedirectOfNonOrgLink,
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
const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({
  getData,
  Page: LegacyPage,
  getLayout: null,
})<"P">;
