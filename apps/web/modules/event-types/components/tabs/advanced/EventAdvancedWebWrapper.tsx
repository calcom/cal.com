import { localeOptions } from "@calcom/lib/i18n";
import { trpc } from "@calcom/trpc/react";
import type { EventAdvancedBaseProps } from "./EventAdvancedTab";
import EventAdvancedTab from "./EventAdvancedTab";

const EventAdvancedWebWrapper = ({
  currentUserMembership,
  ...props
}: EventAdvancedBaseProps & { currentUserMembership?: { role: string } | null }) => {
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
      currentUserMembership={currentUserMembership}
    />
  );
};

export default EventAdvancedWebWrapper;
