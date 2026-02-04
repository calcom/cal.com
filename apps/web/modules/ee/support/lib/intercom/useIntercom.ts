import { noop } from "lodash";
import { useEffect } from "react";
import type { IntercomBootProps, IntercomProps } from "react-use-intercom";
import { useIntercom as useIntercomLib } from "react-use-intercom";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { useHasTeamPlan, useHasPaidPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

export const isInterComEnabled = z.string().min(1).safeParse(process.env.NEXT_PUBLIC_INTERCOM_APP_ID).success;

const useIntercomHook = isInterComEnabled
  ? useIntercomLib
  : () => {
      return {
        boot: (_props: IntercomBootProps) => {},
        show: noop,
        shutdown: noop,
        update: (_props: Partial<IntercomProps>) => {},
      };
    };

export const useIntercom = () => {
  const hookData = useIntercomHook();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { data } = trpc.viewer.me.get.useQuery();
  const { data: statsData } = trpc.viewer.me.myStats.useQuery(undefined, {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });
  const { hasPaidPlan, plan } = useHasPaidPlan();
  const { hasTeamPlan } = useHasTeamPlan();

  const boot = async () => {
    if (!data || !statsData) return;
    let userHash;
    const req = await fetch(`/api/support/hash`);
    const res = await req.json();
    if (res?.hash) {
      userHash = res.hash;
    }

    hookData.boot({
      ...(data && data?.name && { name: data.name }),
      ...(data && data?.email && { email: data.email }),
      ...(data && data?.id && { userId: data.id }),
      createdAt: String(dayjs(data?.createdDate).unix()),
      zIndex: 10,
      ...(userHash && { userHash }),
      hideDefaultLauncher: isMobile,
      customAttributes: {
        //keys should be snake cased
        user_name: data?.username,
        link: `${WEBSITE_URL}/${data?.username}`,
        admin_link: `${WEBAPP_URL}/settings/admin/users/${data?.id}/edit`,
        impersonate_user: `${WEBAPP_URL}/settings/admin/impersonation?username=${
          data?.email ?? data?.username
        }`,
        identity_provider: data?.identityProvider,
        timezone: data?.timeZone,
        locale: data?.locale,
        has_paid_plan: hasPaidPlan,
        has_team_plan: hasTeamPlan,
        metadata: data?.metadata,
        completed_onboarding: data.completedOnboarding,
        is_logged_in: !!data,
        sum_of_bookings: statsData?.sumOfBookings,
        sum_of_calendars: statsData?.sumOfCalendars,
        sum_of_teams: statsData?.sumOfTeams,
        has_orgs_plan: !!data?.organizationId,
        organization: data?.organization?.slug,
        sum_of_event_types: statsData?.sumOfEventTypes,
        sum_of_team_event_types: statsData?.sumOfTeamEventTypes,
        is_premium: data?.isPremium,
        Plan: plan,
      },
    });
  };

  const open = async () => {
    let userHash;

    const req = await fetch(`/api/support/hash`);
    const res = await req.json();
    if (res?.hash) {
      userHash = res.hash;
    }

    hookData.boot({
      ...(data && data?.name && { name: data.name }),
      ...(data && data?.email && { email: data.email }),
      ...(data && data?.id && { userId: data.id }),
      createdAt: String(dayjs(data?.createdDate).unix()),
      ...(userHash && { userHash }),
      hideDefaultLauncher: isMobile,
      zIndex: 10,
      customAttributes: {
        //keys should be snake cased
        user_name: data?.username,
        link: `${WEBSITE_URL}/${data?.username}`,
        admin_link: `${WEBAPP_URL}/settings/admin/users/${data?.id}/edit`,
        impersonate_user: `${WEBAPP_URL}/settings/admin/impersonation?username=${
          data?.email ?? data?.username
        }`,
        identity_provider: data?.identityProvider,
        timezone: data?.timeZone,
        locale: data?.locale,
        has_paid_plan: hasPaidPlan,
        has_team_plan: hasTeamPlan,
        metadata: data?.metadata,
        completed_onboarding: data?.completedOnboarding,
        is_logged_in: !!data,
        sum_of_bookings: statsData?.sumOfBookings,
        sum_of_calendars: statsData?.sumOfCalendars,
        sum_of_teams: statsData?.sumOfTeams,
        has_orgs_plan: !!data?.organizationId,
        organization: data?.organization?.slug,
        sum_of_event_types: statsData?.sumOfEventTypes,
        sum_of_team_event_types: statsData?.sumOfTeamEventTypes,
        is_premium: data?.isPremium,
        Plan: plan,
      },
    });
    hookData.show();
  };
  return { ...hookData, open, boot };
};

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

export const useBootIntercom = () => {
  const { hasPaidPlan } = useHasPaidPlan();
  const flagMap = useFlagMap();
  const { boot, open, update } = useIntercom();

  const { data: user } = trpc.viewer.me.get.useQuery();
  const isTieredSupportEnabled = flagMap["tiered-support-chat"];
  const { data: statsData } = trpc.viewer.me.myStats.useQuery(undefined, {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });
  useEffect(() => {
    // not using useMediaQuery as it toggles between true and false
    const showIntercom = localStorage.getItem("showIntercom");
    if (
      !isInterComEnabled ||
      showIntercom === "false" ||
      !user ||
      !statsData ||
      (!hasPaidPlan && isTieredSupportEnabled)
    )
      return;

    boot();
    if (typeof window !== "undefined" && !window.Support) {
      window.Support = {
        open,
        shouldShowTriggerButton: (showTrigger: boolean) => {
          update({
            hideDefaultLauncher: !showTrigger,
          });
        },
      };
      window.dispatchEvent(new Event("support:ready"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statsData, hasPaidPlan, isTieredSupportEnabled]);
};

export default useIntercom;
