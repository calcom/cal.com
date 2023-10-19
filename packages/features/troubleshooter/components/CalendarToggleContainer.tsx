import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Button, Switch } from "@calcom/ui";

import { TroubleshooterListItemContainer } from "./TroubleshooterListItemContainer";

function CalendarToggleItem() {
  return (
    <TroubleshooterListItemContainer
      title="Google Cal"
      subtitle="google@calendar.com"
      prefixSlot={
        <>
          <div className="h-4 w-4 self-center rounded-[4px] bg-blue-500" />
        </>
      }
      suffixSlot={
        <div>
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        </div>
      }>
      <div className="flex flex-col gap-3">
        <Switch label="google@calendar.com" />
        <Switch label="google@calendar.com" />
      </div>
    </TroubleshooterListItemContainer>
  );
}

export function CalendarToggleContainer() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col space-y-3">
      <p className="text-sm font-medium leading-none">{t("calendars_were_checking_for_conflicts")}</p>
      <CalendarToggleItem />
      <CalendarToggleItem />
      <Button color="secondary" className="justify-center gap-2">
        {t("manage_calendars")}
      </Button>
    </div>
  );
}
