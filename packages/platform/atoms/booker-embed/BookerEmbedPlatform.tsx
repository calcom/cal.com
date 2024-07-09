import type { BookerPlatformWrapperAtomProps } from "../booker/BookerPlatformWrapper";
import { BookerPlatformWrapper } from "../booker/BookerPlatformWrapper";
import { AtomsWrapper } from "../src/components/atoms-wrapper";

export const BookerEmbedPlatform = (props: BookerPlatformWrapperAtomProps) => {
  return (
    <AtomsWrapper>
      <BookerPlatformWrapper {...props} />
    </AtomsWrapper>
  );
};
