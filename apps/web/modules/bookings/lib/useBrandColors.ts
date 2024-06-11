// modules/bookings/lib/useBrandColors.ts
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useCalcomTheme } from "@calcom/ui";

interface BrandColorsProps {
  brandColor?: string | null;
  darkBrandColor?: string | null;
}

const useBrandColors = ({ brandColor, darkBrandColor }: BrandColorsProps) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
};

export default useBrandColors;
