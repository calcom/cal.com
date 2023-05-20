import { useEffect } from "react";

import useGetBrandingColours from "@calcom/lib/getBrandColours";
import useTheme from "@calcom/lib/hooks/useTheme";
import { useCalcomTheme } from "@calcom/ui";

export const useBrandColors = ({
  brandColor,
  darkBrandColor,
  theme,
}: {
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  const { setTheme } = useTheme(theme);

  useEffect(() => {
    if (theme) setTheme(theme);
  }, [setTheme, theme]);
};
