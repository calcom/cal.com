import { _generateMetadata } from "app/_utils";
import type { SearchParams } from "app/_types";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { EmbedPersonalCalendarView } from "~/onboarding/personal/calendar/embed-personal-calendar-view";
import { PersonalCalendarView } from "~/onboarding/personal/calendar/personal-calendar-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("connect_calendar")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/calendar"
  );
};


const ServerPage = async ({ searchParams: searchParamsPromise }: { searchParams: Promise<SearchParams> }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const searchParams = await searchParamsPromise;
  const userEmail = session.user.email || "";

  if (searchParams?.onboardingEmbed === "true") {
    return <EmbedPersonalCalendarView userEmail={userEmail} />;
  }

  return <PersonalCalendarView userEmail={userEmail} />;
};

export default ServerPage;
