import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

import { CalendarListContainer } from "@components/apps/CalendarListContainer";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
      <CalendarListContainer />
    </SettingsHeader>
  );
};

export default Page;
