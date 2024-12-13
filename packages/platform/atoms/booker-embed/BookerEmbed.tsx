import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../booker/BookerPlatformWrapper";
import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import { CalProvider } from "../cal-provider/CalProvider";

export const BookerEmbed = (
  props:
    | (BookerPlatformWrapperAtomPropsForIndividual & { organizationId?: undefined })
    | (BookerPlatformWrapperAtomPropsForTeam & { organizationId?: number })
) => {
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
