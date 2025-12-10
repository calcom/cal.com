import { useRouter } from "next/navigation";

import { setShowWelcomeToCalcomModalFlag } from "@calcom/features/shell/hooks/useWelcomeToCalcomModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { sessionStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

const ORG_MODAL_STORAGE_KEY = "showNewOrgModal";

const DEFAULT_EVENT_TYPES = [
  {
    title: "15min_meeting",
    slug: "15min",
    length: 15,
  },
  {
    title: "30min_meeting",
    slug: "30min",
    length: 30,
  },
  {
    title: "secret_meeting",
    slug: "secret",
    length: 15,
    hidden: true,
  },
];

export const useSubmitPersonalOnboarding = () => {
  const router = useRouter();
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypesHeavy.create.useMutation();

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      try {
        // Create default event types if user has none
        if (eventTypes?.length === 0) {
          await Promise.all(
            DEFAULT_EVENT_TYPES.map(async (event) => {
              return createEventType.mutateAsync({
                title: t(event.title),
                slug: event.slug,
                length: event.length,
                hidden: event.hidden,
              });
            })
          );
        }
      } catch (error) {
        console.error(error);
      }

      await utils.viewer.me.get.refetch();
      // Check if org modal flag is set - if so, don't show personal modal
      // Organization onboarding takes precedence
      const hasOrgModalFlag = sessionStorage.getItem(ORG_MODAL_STORAGE_KEY) === "true";
      
      if (!hasOrgModalFlag) {
        // Only set personal modal flag if org modal flag is not set
        setShowWelcomeToCalcomModalFlag();
        router.push("/event-types?welcomeToCalcomModal=true");
      } else {
        // Org modal flag exists - redirect to event-types without personal modal query param
        // The org modal will show via sessionStorage check
        router.push("/event-types?newOrganizationModal=true");
      }
    },
    onError: (error) => {
      showToast(t("something_went_wrong"), "error");
      console.error(error);
    },
  });

  const submitPersonalOnboarding = () => {
    // telemetry.event(telemetryEventTypes.onboardingFinished);
    mutation.mutate({
      completedOnboarding: true,
    });
  };

  return {
    submitPersonalOnboarding,
    isSubmitting: mutation.isPending,
  };
};
