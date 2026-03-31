import {
  EventAdvancedTab,
  type EventAdvancedBaseProps,
} from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { localeOptions } from "@calcom/lib/i18n";
import { trpc } from "@calcom/trpc/react";
import { UpgradeTeamsBadgeWebWrapper } from "@calcom/web/modules/billing/components/UpgradeTeamsBadgeWebWrapper";
import { useHasActiveTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";
import { WideUpgradeBannerForRedirectUrl } from "@calcom/web/modules/billing/upgrade-banners/WideUpgradeBannerForRedirectUrl";
import {
  SelectedCalendarsSettingsWebWrapper,
  SelectedCalendarsSettingsWebWrapperSkeleton,
} from "@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper";
import { MultiplePrivateLinksController } from "@calcom/web/modules/event-types/components/MultiplePrivateLinksController";
import AddVerifiedEmail from "@calcom/web/modules/event-types/components/AddVerifiedEmail";
import { BookerLayoutSelector } from "@calcom/web/modules/settings/components/BookerLayoutSelector";
import { TimezoneSelect as WebTimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";

const EventAdvancedWebWrapper = ({
  ...props
}: Omit<EventAdvancedBaseProps, "isPlatform" | "platformClientId" | "hasActiveTeamPlan" | "slots">) => {
  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery();
  const { data: verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({
    teamId: props.team?.id,
  });
  const { hasActiveTeamPlan } = useHasActiveTeamPlan();
  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{
        data: connectedCalendarsQuery.data,
        isPending: connectedCalendarsQuery.isPending,
        error: connectedCalendarsQuery.error,
      }}
      showBookerLayoutSelector={true}
      verifiedEmails={verifiedEmails}
      localeOptions={localeOptions}
      hasActiveTeamPlan={hasActiveTeamPlan}
      slots={{
        SelectedCalendarsSettings: SelectedCalendarsSettingsWebWrapper,
        SelectedCalendarsSettingsSkeleton: SelectedCalendarsSettingsWebWrapperSkeleton,
        TimezoneSelect: WebTimezoneSelect,
        MultiplePrivateLinksController,
        AddVerifiedEmail,
        BookerLayoutSelector,
        UpgradeTeamsBadge: UpgradeTeamsBadgeWebWrapper,
        WideUpgradeBannerForRedirectUrl,
      }}
    />
  );
};

export default EventAdvancedWebWrapper;
