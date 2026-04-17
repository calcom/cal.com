"use client";

import { TOP_BANNER_HEIGHT } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { AllBannerProps } from "./LayoutBanner";

const useBannersInternal = () => {
  const { data: getUserTopBanners, isPending } = trpc.viewer.me.getUserTopBanners.useQuery();
  const { data: userSession } = useSession();

  if (isPending || !userSession) return null;

  const isUserInactiveAdmin = userSession?.user.role === "INACTIVE_ADMIN";
  const userImpersonatedByUID = userSession?.user.impersonatedBy?.id;

  const userSessionBanners = {
    adminPasswordBanner: isUserInactiveAdmin ? userSession : null,
    impersonationBanner: userImpersonatedByUID ? userSession : null,
  };

  const allBanners: AllBannerProps = Object.assign({}, getUserTopBanners, userSessionBanners);

  return allBanners;
};

const useBannersHeight = (banners: AllBannerProps | null) => {
  const bannersHeight = useMemo(() => {
    const activeBanners =
      banners &&
      Object.entries(banners).filter(([_, value]) => {
        return value && (!Array.isArray(value) || value.length > 0);
      });
    return (activeBanners?.length ?? 0) * TOP_BANNER_HEIGHT;
  }, [banners]);

  return bannersHeight;
};

const useBanners = () => {
  const banners = useBannersInternal();
  const bannersHeight = useBannersHeight(banners);
  return { banners, bannersHeight };
};

export { useBanners, useBannersHeight };
