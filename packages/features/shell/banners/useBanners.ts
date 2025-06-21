"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { TOP_BANNER_HEIGHT } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";

import { type AllBannerProps } from "./LayoutBanner";

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
    if (!banners) return 0;

    let totalHeight = 0;
    
    Object.entries(banners).forEach(([key, value]) => {
      if (!value) return;
      
      if (Array.isArray(value)) {
        // For arrays (like invalidAppCredentialBanners), count each item as a separate banner
        if (value.length > 0) {
          totalHeight += value.length * TOP_BANNER_HEIGHT;
        }
      } else {
        // For non-array values, count as one banner
        totalHeight += TOP_BANNER_HEIGHT;
      }
    });
    
    return totalHeight;
  }, [banners]);

  return bannersHeight;
};

const useBanners = () => {
  const banners = useBannersInternal();
  const bannersHeight = useBannersHeight(banners);
  return { banners, bannersHeight };
};

export { useBanners, useBannersHeight };
