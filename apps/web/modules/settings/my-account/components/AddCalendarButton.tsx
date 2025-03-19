"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

const AddCalendarButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon="plus" href="/apps/categories/calendar">
        {t("add_calendar")}
      </Button>
    </>
  );
};

export default AddCalendarButton;
