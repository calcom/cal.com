import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../booker/BookerPlatformWrapper";
import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import { CalProvider } from "../cal-provider/CalProvider";
import { useGetRoutingFormUrlProps } from "./useGetRoutingFormUrlProps";

export const BookerEmbed = (
  props:
    | (BookerPlatformWrapperAtomPropsForIndividual & { organizationId?: undefined; routingFormUrl?: string })
    | (BookerPlatformWrapperAtomPropsForTeam & { organizationId?: number; routingFormUrl?: string })
) => {
  const routingFormUrlProps = useGetRoutingFormUrlProps(props);
  if (routingFormUrlProps) {
    const { organizationId, teamId: routingTeamId, ...routingFormSearchParams } = routingFormUrlProps;
    return (
      <CalProvider
        clientId={import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID}
        isEmbed={true}
        organizationId={organizationId}
        options={{
          apiUrl: import.meta.env.VITE_BOOKER_EMBED_API_URL,
        }}>
        <BookerPlatformWrapper
          {...(Boolean(routingTeamId) ? { ...props, isTeamEvent: true, teamId: routingTeamId || 0 } : props)}
          routingFormSearchParams={routingFormSearchParams}
        />
      </CalProvider>
    );
  }

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
};
