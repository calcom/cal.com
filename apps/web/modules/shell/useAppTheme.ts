"use client";

import getBrandColours from "@calcom/lib/getBrandColours";
import useTheme from "@calcom/lib/hooks/useTheme";
import useMeTheme from "@calcom/trpc/react/hooks/useMeTheme";
import { useCalcomTheme } from "@calcom/ui/styles";

export const useAppTheme = () => {
  const { data: themeData } = useMeTheme();
  const brandTheme = getBrandColours({
    lightVal: themeData?.brandColor,
    darkVal: themeData?.darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  useTheme(themeData?.appTheme);
};
