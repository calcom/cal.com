import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayoutAppDir";
import { Button } from "@calcom/ui";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session.user.locale || "en");

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
    <SettingsLayout
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      {children}
    </SettingsLayout>
  );
}
