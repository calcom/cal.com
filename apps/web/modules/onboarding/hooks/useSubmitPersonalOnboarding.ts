import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { setShowWelcomeToCalcomModalFlag } from "@calcom/web/modules/shell/hooks/useWelcomeToCalcomModal";
import { useRouter } from "next/navigation";

const ONBOARDING_REDIRECT_KEY = "onBoardingRedirect";

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

      const redirectUrl = localStorage.getItem(ONBOARDING_REDIRECT_KEY);
      if (redirectUrl) {
        localStorage.removeItem(ONBOARDING_REDIRECT_KEY);
        router.push(redirectUrl);
        return;
      }

      setShowWelcomeToCalcomModalFlag();
      router.push("/event-types?welcomeToCalcomModal=true");
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
