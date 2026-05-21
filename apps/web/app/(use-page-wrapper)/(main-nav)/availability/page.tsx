import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getI18nEditAttributes } from "@calcom/lib/i18nEditMode";
import { getScheduleListItemData } from "@calcom/lib/schedules/transformers/getScheduleListItemData";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AvailabilityCTA, AvailabilityList } from "~/availability/availability-view";
import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability"),
    undefined,
    undefined,
    "/availability"
  );
};

const getCachedAvailabilities = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const availabilityCaller = await createRouterCaller(
      availabilityRouter,
      await getTRPCContext(headers, cookies)
    );
    return await availabilityCaller.list();
  },
  ["viewer.availability.list"],
  { revalidate: 3600 } // Cache for 1 hour
);

const Page = async () => {
  const t = await getTranslate();
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const locale = session.user.locale ?? "en";
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);

  const cachedAvailabilities = await getCachedAvailabilities(_headers, _cookies);

  // Transform the data to ensure startTime, endTime, and date are Date objects
  // This is because the data is cached and as a result the data is converted to a string
  const availabilities = {
    ...cachedAvailabilities,
    schedules: cachedAvailabilities.schedules.map((schedule) => getScheduleListItemData(schedule)),
  };

  return (
    <ShellMainAppDir
      heading={<span {...i18nEdit("availability")}>{t("availability")}</span>}
      subtitle={<span {...i18nEdit("configure_availability")}>{t("configure_availability")}</span>}
      CTA={<AvailabilityCTA />}>
      <AvailabilityList availabilities={availabilities ?? { schedules: [] }} />
    </ShellMainAppDir>
  );
};

export default Page;
