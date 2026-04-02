import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
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

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return <PersonalCalendarView userEmail={userEmail} />;
};

export default ServerPage;
