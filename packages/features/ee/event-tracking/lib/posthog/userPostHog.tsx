// eslint-disable-next-line no-restricted-imports
import type { PostHog } from "posthog-js";
import { usePostHog as usePostHogLib } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useHasTeamPlan, useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { trpc } from "@calcom/trpc/react";

export const isPostHogEnabled = z.string().min(1).safeParse(process.env.NEXT_PUBLIC_POSTHOG_KEY).success;

// Define the return type for our hook
type PostHogMethods = {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (distinctId?: string, properties?: Record<string, any>) => void;
  reset: () => void;
};

// Internal hook type that includes the methods we need
type InternalPostHogHook = Pick<PostHog, "identify" | "capture" | "reset" | "register" | "get_distinct_id">;

const usePostHogHook: () => InternalPostHogHook = isPostHogEnabled
  ? usePostHogLib
  : () => ({
      identify: () => undefined,
      capture: () => undefined,
      reset: () => undefined,
      register: () => undefined,
      get_distinct_id: () => "",
    });

const usePostHog = (): PostHogMethods => {
  const posthog = usePostHogHook();
  const { data: userData } = trpc.viewer.me.useQuery();
  const { data: statsData } = trpc.viewer.myStats.useQuery(undefined, {
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasTeamPlan } = useHasTeamPlan();
  const lastPropertiesString = useRef<string | null>(null);

  useEffect(() => {
    if (!userData || !statsData) return;

    const properties = {
      name: userData.name,
      email: userData.email,
      created_at: String(dayjs(userData.createdDate).unix()),
      user_name: userData.username,
      link: `${WEBSITE_URL}/${userData.username}`,
      identity_provider: userData.identityProvider,
      timezone: userData.timeZone,
      locale: userData.locale,
      has_paid_plan: hasPaidPlan,
      has_team_plan: hasTeamPlan,
      completed_onboarding: userData.completedOnboarding,
      has_orgs_plan: !!userData.organizationId,
      organization: userData.organization?.slug,
      is_premium: userData.isPremium,
      sum_of_bookings: statsData?.sumOfBookings,
      sum_of_calendars: statsData?.sumOfCalendars,
      sum_of_teams: statsData?.sumOfTeams,
      sum_of_event_types: statsData?.sumOfEventTypes,
      sum_of_team_event_types: statsData?.sumOfTeamEventTypes,
    };

    // Clean properties
    const cleanProperties = Object.fromEntries(Object.entries(properties).filter(([_, v]) => v != null));

    // Create a string representation of the properties for comparison
    const propertiesString = JSON.stringify(cleanProperties);

    // Only set properties if they've changed
    if (propertiesString !== lastPropertiesString.current) {
      lastPropertiesString.current = propertiesString;
      // Use register instead of identify to avoid duplicate calls
      posthog.register(cleanProperties);
      // Only identify once
      if (!posthog.get_distinct_id()) {
        posthog.identify(String(userData.id));
      }
    }
  }, [userData, statsData, hasPaidPlan, hasTeamPlan, posthog]);

  return {
    capture: (event: string, properties?: Record<string, any>) => {
      if (posthog.get_distinct_id()) {
        posthog.capture(event, properties);
      }
    },
    identify: (distinctId?: string, properties?: Record<string, any>) => {
      if (distinctId) {
        posthog.identify(distinctId, properties);
      }
    },
    reset: () => {
      lastPropertiesString.current = null;
      posthog.reset();
    },
  };
};

export default usePostHog;
