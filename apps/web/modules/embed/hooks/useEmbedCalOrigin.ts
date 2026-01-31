import { useEmbedBookerUrl } from "~/bookings/hooks/useBookerUrl";

export const useEmbedCalOrigin = () => {
    const bookerUrl = useEmbedBookerUrl();
    return bookerUrl;
};
  