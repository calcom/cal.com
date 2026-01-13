"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useHasTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

import { UpgradeTeamsBadgeWebWrapper as UpgradeTeamsBadge } from "~/billing/components/UpgradeTeamsBadgeWebWrapper";

interface CalendarOption {
  value: string;
  label: string;
}

export function TeamOOOCalendarSync() {
  const { t } = useLocale();
  const session = useSession();
  const { hasTeamPlan } = useHasTeamPlan();

  const isOrgAdminOrOwner = checkAdminOrOwner(session?.data?.user.org?.role);
  const hasOrganization = !!session?.data?.user.org?.id;

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);

  const { data: calendarsData, isPending: isCalendarsPending } =
    trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
      enabled: isOrgAdminOrOwner && hasOrganization,
    });

  const calendarOptions: CalendarOption[] =
    calendarsData?.connectedCalendars?.flatMap((connected) =>
      (connected.calendars ?? [])
        .filter((cal) => cal.readOnly === false)
        .map((cal) => ({
          value: `${cal.integration}:${cal.externalId}`,
          label: `${cal.name} (${connected.integration.title?.replace(/calendar/i, "")} - ${connected.primary?.name})`,
        }))
    ) ?? [];

  const selectedOption = calendarOptions.find((opt) => opt.value === selectedCalendar) ?? null;

  const showUpgradeBadge = hasTeamPlan && !hasOrganization;
  const isDisabled = !hasOrganization || !isOrgAdminOrOwner;

  if (!isOrgAdminOrOwner && !showUpgradeBadge) {
    return null;
  }

  return (
    <div className="mb-6">
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        labelClassName="text-sm"
        title={t("sync_ooo_to_calendar")}
        description={t("sync_ooo_to_calendar_description")}
        checked={syncEnabled}
        disabled={isDisabled}
        onCheckedChange={(checked) => {
          setSyncEnabled(checked);
          if (!checked) {
            setSelectedCalendar(null);
          }
        }}
        switchContainerClassName={classNames(
          "border-subtle rounded-lg border py-6 px-4 sm:px-6",
          syncEnabled && "rounded-b-none"
        )}
        childrenClassName="lg:ml-0"
        Badge={showUpgradeBadge ? <UpgradeTeamsBadge /> : undefined}>
        {syncEnabled && (
          <div className="border-subtle border border-t-0 p-6">
            <Label className="text-emphasis mb-2">{t("select_shared_calendar")}</Label>
            <Select<CalendarOption>
              className="w-full"
              value={selectedOption}
              onChange={(option) => {
                setSelectedCalendar(option?.value ?? null);
                if (option) {
                  showToast(t("calendar_selected_successfully"), "success");
                }
              }}
              options={calendarOptions}
              placeholder={t("select_calendar")}
              isLoading={isCalendarsPending}
              isDisabled={isDisabled}
            />
            <p className="text-subtle mt-2 text-sm">{t("shared_calendar_tip")}</p>
          </div>
        )}
      </SettingsToggle>
    </div>
  );
}
