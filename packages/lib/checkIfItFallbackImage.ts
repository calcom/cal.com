import { AVATAR_FALLBACK } from "./constants";

const checkIfItFallbackImage = (fetchedImgSrc: string) => {
  return !fetchedImgSrc || fetchedImgSrc.endsWith(AVATAR_FALLBACK);
};
export default checkIfItFallbackImage;
