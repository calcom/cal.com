import { CalProvider } from "../../atoms/cal-provider/CalProvider";
import type { BookerPlatformWrapperAtomProps } from "../booker/BookerPlatformWrapper";
import "../globals.min.css";
import { BookerEmbedPlatform } from "./BookerEmbedPlatform";

export const BookerEmbedPlatformWrapper = (props: BookerPlatformWrapperAtomProps) => {
  return (
    <CalProvider
      clientId={import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID}
      options={{
        apiUrl: import.meta.env.VITE_BOOKER_EMBED_API_URL,
      }}>
      <BookerEmbedPlatform {...props} />
    </CalProvider>
  );
};
