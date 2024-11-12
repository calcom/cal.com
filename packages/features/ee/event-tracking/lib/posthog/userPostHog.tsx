// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { usePostHog as usePostHogLib } from "posthog-js/react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useHasTeamPlan, useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { trpc } from "@calcom/trpc/react";

// eslint-disable-next-line turbo/no-undeclared-env-vars
export const isPostHogEnabled = z.string().min(1).safeParse(process.env.NEXT_PUBLIC_POSTHOG_KEY).success;

type PostHogHook = {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string, properties?: Record<string, any>) => void;
  reset: () => void;
};

const usePostHogHook: () => PostHogHook = isPostHogEnabled
  ? usePostHogLib
  : () => ({
      identify: noop,
      capture: noop,
      reset: noop,
    });

const usePostHog = () => {
  const posthog = usePostHogHook();
  const { data } = trpc.viewer.me.useQuery();
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasTeamPlan } = useHasTeamPlan();

  const identify = async () => {
    if (!data) return;

    posthog.identify(String(data.id), {
      distinctId: String(data.id),
      ...(data && data?.name && { name: data.name }),
      ...(data && data?.email && { email: data.email }),
      created_at: String(dayjs(data?.createdDate).unix()),
      //keys should be snake cased
      user_name: data?.username,
      link: `${WEBSITE_URL}/${data?.username}`,
      identity_provider: data?.identityProvider,
      timezone: data?.timeZone,
      locale: data?.locale,
      has_paid_plan: hasPaidPlan,
      has_team_plan: hasTeamPlan,
      metadata: data?.metadata,
      completed_onboarding: data?.completedOnboarding,
      sum_of_bookings: data?.sumOfBookings,
      sum_of_calendars: data?.sumOfCalendars,
      sum_of_teams: data?.sumOfTeams,
      has_orgs_plan: !!data?.organizationId,
      organization: data?.organization?.slug,
      sum_of_event_types: data?.sumOfEventTypes,
      sum_of_team_event_types: data?.sumOfTeamEventTypes,
      is_premium: data?.isPremium,
    });
  };

  return { identify, capture: posthog.capture, reset: posthog.reset };
};

export default usePostHog;
