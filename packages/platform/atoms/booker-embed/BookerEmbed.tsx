import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../booker/types";
import { CalProvider } from "../cal-provider/CalProvider";
import { useGetRoutingFormUrlProps } from "./useGetRoutingFormUrlProps";

export const BookerEmbed = (
  props:
    | {
        routingFormUrl: string;
        bannerUrl?: BookerPlatformWrapperAtomPropsForTeam["bannerUrl"];
        customClassNames?: BookerPlatformWrapperAtomPropsForTeam["customClassNames"];
        onCreateBookingSuccess?: BookerPlatformWrapperAtomPropsForTeam["onCreateBookingSuccess"];
        onCreateBookingError?: BookerPlatformWrapperAtomPropsForTeam["onCreateBookingError"];
        onCreateRecurringBookingSuccess?: BookerPlatformWrapperAtomPropsForTeam["onCreateRecurringBookingSuccess"];
        onCreateRecurringBookingError?: BookerPlatformWrapperAtomPropsForTeam["onCreateRecurringBookingError"];
        onReserveSlotSuccess?: BookerPlatformWrapperAtomPropsForTeam["onReserveSlotSuccess"];
        onReserveSlotError?: BookerPlatformWrapperAtomPropsForTeam["onReserveSlotError"];
        onDeleteSlotSuccess?: BookerPlatformWrapperAtomPropsForTeam["onDeleteSlotSuccess"];
        onDeleteSlotError?: BookerPlatformWrapperAtomPropsForTeam["onDeleteSlotError"];
        view?: BookerPlatformWrapperAtomPropsForTeam["view"];
        onDryRunSuccess?: BookerPlatformWrapperAtomPropsForTeam["onDryRunSuccess"];
        hostsLimit?: BookerPlatformWrapperAtomPropsForTeam["hostsLimit"];
        metadata?: BookerPlatformWrapperAtomPropsForTeam["metadata"];
        handleCreateBooking?: BookerPlatformWrapperAtomPropsForTeam["handleCreateBooking"];
        handleSlotReservation?: BookerPlatformWrapperAtomPropsForTeam["handleSlotReservation"];
        preventEventTypeRedirect?: BookerPlatformWrapperAtomPropsForTeam["preventEventTypeRedirect"];
      }
    | (BookerPlatformWrapperAtomPropsForIndividual & {
        organizationId?: number;
        routingFormUrl?: undefined;
      })
    | (BookerPlatformWrapperAtomPropsForTeam & { organizationId?: number; routingFormUrl?: undefined })
) => {
  // Use Routing Form Url To Display Correct Booker
  const routingFormUrlProps = useGetRoutingFormUrlProps(props);
  if (props?.routingFormUrl && routingFormUrlProps) {
    const {
      organizationId,
      teamId: routingTeamId,
      eventTypeSlug,
      username,
      defaultFormValues,
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
      ...routingFormSearchParams
    } = routingFormUrlProps;
    const { onDryRunSuccess, ...rest } = props;
    return (
      <CalProvider
        clientId={import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID}
        isEmbed={true}
        organizationId={organizationId}
        options={{
          apiUrl: import.meta.env.VITE_BOOKER_EMBED_API_URL,
        }}>
        <BookerPlatformWrapper
          {...(Boolean(routingTeamId)
            ? {
                eventSlug: eventTypeSlug,
                isTeamEvent: true,
                teamId: routingTeamId || 0,
                username: "",
              }
            : {
                eventSlug: eventTypeSlug,
                username: username ?? "",
                isTeamEvent: false,
              })}
          routingFormSearchParams={routingFormSearchParams}
          defaultFormValues={defaultFormValues}
          teamMemberEmail={teamMemberEmail}
          crmOwnerRecordType={crmOwnerRecordType}
          crmAppSlug={crmAppSlug}
          onDryRunSuccess={() => {
            if (onDryRunSuccess) {
              onDryRunSuccess();
            } else {
              window.location.href = `https://app.cal.com/booking/dry-run-successful`;
            }
          }}
          {...rest}
        />
      </CalProvider>
    );
  }

  // If Not For From Routing, Use Props
  if (props?.routingFormUrl === undefined) {
    return (
      <CalProvider
        clientId={import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID}
        isEmbed={true}
        organizationId={props?.organizationId}
        options={{
          apiUrl: import.meta.env.VITE_BOOKER_EMBED_API_URL,
        }}>
        <BookerPlatformWrapper {...props} />
      </CalProvider>
    );
  }

  return <></>;
};
