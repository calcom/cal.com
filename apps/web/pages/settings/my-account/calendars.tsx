import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";

import AddCalendarButton from "~/settings/my-account/components/AddCalendarButton";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("calendars")}
        description={t("calendars_description")}
        CTA={<AddCalendarButton />}
        borderInShellHeader={false}
      />
      <div className="mt-8">
        <CalendarListContainer />
      </div>
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
