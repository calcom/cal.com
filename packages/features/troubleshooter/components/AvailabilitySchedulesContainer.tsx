import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Button, Switch } from "@calcom/ui";

import { TroubleshooterListItemContainer } from "./TroubleshooterListItemContainer";

function AvailabiltyItem() {
  const { t } = useLocale();
  return (
    <TroubleshooterListItemContainer
      title="Office Hours"
      subtitle="Mon-Fri; 9:00 AM - 5:00 PM"
      suffixSlot={
        <div>
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        </div>
      }>
      <div className="flex flex-col gap-3">
        <p className="text-subtle text-sm font-medium leading-none">{t("date_overrides")}</p>
        <Switch label="google@calendar.com" />
      </div>
    </TroubleshooterListItemContainer>
  );
}

export function AvailabiltySchedulesContainer() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col space-y-3">
      <p className="text-sm font-medium leading-none">{t("availabilty_schedules")}</p>
      <AvailabiltyItem />
      <Button color="secondary" className="justify-center gap-2">
        {t("manage_availabilty_schedules")}
      </Button>
    </div>
  );
}
