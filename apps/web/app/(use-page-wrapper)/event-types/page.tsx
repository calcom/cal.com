import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

import EventTypes from "~/event-types/views/event-types-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle")
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const session = await getServerSession({ req: context.req });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  await ssrInit(context);

  return <EventTypes />;
};

export default Page;
