import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

import CalendarsView from "~/settings/my-account/calendars-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const t = await getFixedT(session?.user.locale || "en");

  const AddCalendarButton = () => {
    return (
      <>
        <Button color="secondary" StartIcon="plus" href="/apps/categories/calendar">
          {t("add_calendar")}
        </Button>
      </>
    );
  };

  return (
    <SettingsHeader
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      <CalendarsView />
    </SettingsHeader>
  );
};

export default Page;
