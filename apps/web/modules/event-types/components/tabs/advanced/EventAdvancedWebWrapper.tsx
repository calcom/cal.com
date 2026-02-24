import {
  type EventAdvancedBaseProps,
  EventAdvancedTab,
} from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { localeOptions } from "@calcom/lib/i18n";
import { trpc } from "@calcom/trpc/react";
import {
  SelectedCalendarsSettingsWebWrapper,
  SelectedCalendarsSettingsWebWrapperSkeleton,
} from "@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper";
import { MultiplePrivateLinksController } from "@calcom/web/modules/event-types/components";
import AddVerifiedEmail from "@calcom/web/modules/event-types/components/AddVerifiedEmail";
import { BookerLayoutSelector } from "@calcom/web/modules/settings/components/BookerLayoutSelector";
import { TimezoneSelect as WebTimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";

const EventAdvancedWebWrapper = ({ ...props }: EventAdvancedBaseProps) => {
  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery();
  const { data: verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({
    teamId: props.team?.id,
  });
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
      slots={{
        SelectedCalendarsSettings: SelectedCalendarsSettingsWebWrapper,
        SelectedCalendarsSettingsSkeleton: SelectedCalendarsSettingsWebWrapperSkeleton,
        TimezoneSelect: WebTimezoneSelect,
        MultiplePrivateLinksController: MultiplePrivateLinksController,
        AddVerifiedEmail: AddVerifiedEmail,
        BookerLayoutSelector: BookerLayoutSelector,
      }}
    />
  );
};

export default EventAdvancedWebWrapper;
