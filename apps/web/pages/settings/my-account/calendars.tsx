import { Fragment } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta, SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle mt-8 space-y-6 rounded-lg border px-4 py-6 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const AddCalendarButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={Plus} href="/apps/categories/calendar">
        {t("add_calendar")}
      </Button>
    </>
  );
};

const CalendarsView = () => {
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

CalendarsView.getLayout = getLayout;
CalendarsView.PageWrapper = PageWrapper;

export default CalendarsView;
