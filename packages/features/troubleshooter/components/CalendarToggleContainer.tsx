import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

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
    sqlCacheUpdatedAt?: Date | null;
    sqlCacheSubscriptionCount?: number;
  }[];
  // Legacy cache data props (at credential level)
  cacheData?: {
    updatedAt: Date | null;
  };
}

function CalendarToggleItem(props: CalendarToggleItemProps) {
  const badgeStatus = props.status === "connected" ? "green" : "orange";
  const badgeText = props.status === "connected" ? "Connected" : "Not found";
  
  // Format cache update time for display
  const formatCacheTime = (date: Date | null) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Create tooltip content for SQL cache data
  const createSqlCacheTooltipContent = (calendar: CalendarToggleItemProps['calendars'][0]) => {
    if (!calendar.sqlCacheUpdatedAt && (!calendar.sqlCacheSubscriptionCount || calendar.sqlCacheSubscriptionCount === 0)) {
      return null;
    }

    const parts = [];
    if (calendar.sqlCacheUpdatedAt) {
      parts.push(`Last sync: ${formatCacheTime(calendar.sqlCacheUpdatedAt)}`);
    }
    if (calendar.sqlCacheSubscriptionCount && calendar.sqlCacheSubscriptionCount > 0) {
      parts.push(`${calendar.sqlCacheSubscriptionCount} subscription${calendar.sqlCacheSubscriptionCount > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

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
        <div className="flex flex-col items-end gap-1">
          <Badge variant={badgeStatus} withDot size="sm">
            {badgeText}
          </Badge>
          {/* Legacy Cache Data (at credential level) */}
          {props.cacheData && (
            <div className="text-xs text-muted-foreground">
              Legacy Cache: {formatCacheTime(props.cacheData.updatedAt)}
            </div>
          )}
        </div>
      }>
      <div className="[&>*]:text-emphasis flex flex-col gap-3">
        {props.calendars?.map((calendar) => {
          const sqlCacheTooltipContent = createSqlCacheTooltipContent(calendar);
          
          return (
            <div key={calendar.name} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Switch checked={calendar.active} label={calendar.name} disabled />
                {sqlCacheTooltipContent && (
                  <Tooltip content={sqlCacheTooltipContent}>
                    <div className="text-xs text-muted-foreground cursor-help">
                      ℹ️
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          );
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
    <div className="flex flex-col space-y-3">
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
                    sqlCacheUpdatedAt: item.sqlCacheUpdatedAt,
                    sqlCacheSubscriptionCount: item.sqlCacheSubscriptionCount,
                  };
                })}
                // Legacy cache data (at credential level)
                cacheData={{
                  updatedAt: calendar.cacheUpdatedAt,
                }}
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
