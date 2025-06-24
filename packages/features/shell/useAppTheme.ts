"use client";

import getBrandColours from "@calcom/lib/getBrandColours";
import useTheme from "@calcom/lib/hooks/useTheme";
import { useCalcomTheme } from "@calcom/ui/styles";

import { useUser } from "./context/UserProvider";

export const useAppTheme = () => {
  const { user } = useUser();
  const brandTheme = getBrandColours({
    lightVal: user?.brandColor,
    darkVal: user?.darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  useTheme(user?.appTheme);
};
