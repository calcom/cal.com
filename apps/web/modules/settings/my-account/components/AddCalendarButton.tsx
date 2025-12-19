"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PlusIcon } from "lucide-react";

import { Button } from "@calcom/ui/components/button";

const AddCalendarButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={PlusIcon} href="/apps/categories/calendar">
        {t("add_calendar")}
      </Button>
    </>
  );
};

export default AddCalendarButton;
