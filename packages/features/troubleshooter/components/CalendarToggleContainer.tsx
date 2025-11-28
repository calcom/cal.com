import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";

import { TroubleshooterListItemContainer } from "./TroubleshooterListItemContainer";

const SELECTION_COLORS = ["#f97316", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e"];

interface CalendarToggleItemProps {
  title: string;
  subtitle: string;
  colorDot?: string;
  status: "connected" | "not_found";
  calendars?: {
    active?: boolean;
    name?: string;
  }[];
}
function CalendarToggleItem(props: CalendarToggleItemProps) {
  const badgeStatus = props.status === "connected" ? "green" : "orange";
  const badgeText = props.status === "connected" ? "Connected" : "Not found";
  return (
    <TroubleshooterListItemContainer
      title={props.title}
      subtitle={props.subtitle}
      prefixSlot={
        <>
          <div
            className="h-4 w-4 self-center rounded-[4px]"
            style={{
              backgroundColor: props.colorDot,
            }}
          />
        </>
      }
      suffixSlot={
        <div>
          <Badge variant={badgeStatus} withDot size="sm">
            {badgeText}
          </Badge>
        </div>
      }>
      <div className="[&>*]:text-emphasis flex flex-col gap-3">
        {props.calendars?.map((calendar) => {
          return <Switch key={calendar.name} checked={calendar.active} label={calendar.name} disabled />;
        })}
      </div>
    </TroubleshooterListItemContainer>
  );
}

function EmptyCalendarToggleItem() {
  const { t } = useLocale();

  return (
    <TroubleshooterListItemContainer
      title={t("installed", { count: 0 })}
      subtitle={t("please_install_a_calendar")}
      prefixSlot={
        <>
          <div className="h-4 w-4 self-center rounded-[4px] bg-blue-500" />
        </>
      }
      suffixSlot={
        <div>
          <Badge variant="orange" withDot size="sm">
            {t("unavailable")}
          </Badge>
        </div>
      }>
      <div className="flex flex-col gap-3">
        <Button color="secondary" className="justify-center gap-2" href="/apps/categories/calendar">
          {t("install_calendar")}
        </Button>
      </div>
    </TroubleshooterListItemContainer>
  );
}

export function CalendarToggleContainer() {
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.calendars.connectedCalendars.useQuery();

  const hasConnectedCalendars = data && data?.connectedCalendars.length > 0;

  return (
    <div className="flex flex-col stack-y-3">
      <p className="text-sm font-medium leading-none">{t("calendars_were_checking_for_conflicts")}</p>
      {hasConnectedCalendars && !isLoading ? (
        <>
          {data.connectedCalendars.map((calendar) => {
            const foundPrimary = calendar.calendars?.find((item) => item.primary);
            // Will be used when getAvailbility is modified to use externalId instead of appId for source.
            // const color = SELECTION_COLORS[idx] || "#000000";
            // // Add calendar to color map using externalId (what we use on the backend to determine source)
            // addToColorMap(foundPrimary?.externalId, color);
            return (
              <CalendarToggleItem
                key={calendar.credentialId}
                title={calendar.integration.name}
                colorDot="#000000"
                subtitle={foundPrimary?.name ?? "Nameless Calendar"}
                status={calendar.error ? "not_found" : "connected"}
                calendars={calendar.calendars?.map((item) => {
                  return {
                    active: item.isSelected,
                    name: item.name,
                  };
                })}
              />
            );
          })}
          <Button color="secondary" className="justify-center gap-2" href="/settings/my-account/calendars">
            {t("manage_calendars")}
          </Button>
        </>
      ) : (
        <EmptyCalendarToggleItem />
      )}
    </div>
  );
}
