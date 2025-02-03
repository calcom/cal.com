import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../booker/BookerPlatformWrapper";
import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import { CalProvider } from "../cal-provider/CalProvider";
import { useGetRoutingFormUrlProps } from "./useGetRoutingFormUrlProps";

export const BookerEmbed = (
  props:
    | {
        routingFormUrl: string;
        bannerUrl?: BookerPlatformWrapperAtomPropsForTeam["bannerUrl"];
        customClassNames?: BookerPlatformWrapperAtomPropsForTeam["customClassNames"];
      }
    | (BookerPlatformWrapperAtomPropsForIndividual & {
        organizationId?: undefined;
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
      ...routingFormSearchParams
    } = routingFormUrlProps;
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
                customClassNames: props?.customClassNames,
              }
            : {
                eventSlug: eventTypeSlug,
                username: username ?? "",
                isTeamEvent: false,
                customClassNames: props?.customClassNames,
              })}
          routingFormSearchParams={routingFormSearchParams}
          defaultFormValues={defaultFormValues}
          bannerUrl={props.bannerUrl}
          onDryRunSuccess={() => {
            window.location.href = `https://app.cal.com/booking/dry-run-successful`;
          }}
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
