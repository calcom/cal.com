import { Label } from "@calcom/ui/components/form";
import type React from "react";
import { TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ScheduleItem {
  id: number;
  name: string;
}

interface EventScheduleItemComponentProps {
  schedule: ScheduleItem | null;
  suffixSlot?: React.ReactNode;
}

export function EventScheduleItemComponent({
  schedule,
  suffixSlot,
}: EventScheduleItemComponentProps): JSX.Element {
  const { t } = useLocale();

  return (
    <div>
      <Label> {t("availability_schedule")}</Label>
      <TroubleshooterListItemHeader
        className="group rounded-md border-b"
        prefixSlot={<div className="w-4 rounded-[4px] bg-black" />}
        title={schedule?.name ?? t("loading")}
        suffixSlot={suffixSlot}
      />
    </div>
  );
}
