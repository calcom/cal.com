import type {
  BookerPlatformWrapperAtomPropsForIndividual,
  BookerPlatformWrapperAtomPropsForTeam,
} from "../booker/BookerPlatformWrapper";
import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import { CalProvider } from "../cal-provider/CalProvider";

export const BookerEmbed = (
  props: BookerPlatformWrapperAtomPropsForIndividual | BookerPlatformWrapperAtomPropsForTeam
) => {
  return (
    <CalProvider
      clientId={import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID}
      isEmbed={true}
      options={{
        apiUrl: import.meta.env.VITE_BOOKER_EMBED_API_URL,
      }}>
      <BookerPlatformWrapper {...props} />
    </CalProvider>
  );
};
