import type { EventAdvancedBaseProps } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { localeOptions } from "@calcom/lib/i18n";
import { trpc } from "@calcom/trpc/react";

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
    />
  );
};

export default EventAdvancedWebWrapper;
