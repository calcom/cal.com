// import { CalProvider } from "../../atoms/cal-provider/CalProvider";
// import type { BookerPlatformWrapperAtomProps } from "../booker/BookerPlatformWrapper";
// import { BookerEmbed } from "./BookerEmbed";
// // need to wrap this around a cal provider where accessToken, clientId and optios would be preset by us
// export const BookerEmbedPlatformWrapper = (props: BookerPlatformWrapperAtomProps) => {
//   return (
//     <CalProvider>
//       <BookerEmbed {...props} />
//     </CalProvider>
//   );
// };

export const BookerEmbedPlatformWrapper = () => {
  console.log(import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID, "env for booker embed oauth client id");
  console.log(import.meta.env.VITE_BOOKER_EMBED_API_URL, "env for booker embed api url");
  console.log(import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID, "env for booker ember oauth client id");

  return <>Hello world, this is just to test booker embed</>;
};
