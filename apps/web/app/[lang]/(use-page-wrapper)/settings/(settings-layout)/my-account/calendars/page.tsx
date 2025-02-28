import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

import { CalendarListContainer } from "@components/apps/CalendarListContainer";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("calendars"), t("calendars_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

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
