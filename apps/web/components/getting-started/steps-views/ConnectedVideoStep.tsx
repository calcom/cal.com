import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { List } from "@calcom/ui/components/list";

import { AppConnectionItem } from "../components/AppConnectionItem";
import { StepConnectionLoader } from "../components/StepConnectionLoader";

interface ConnectedAppStepProps {
  nextStep: () => void;
  isPageLoading: boolean;
}

const ConnectedVideoStep = ({
  ...props
}: ConnectedAppStepProps) => {
  const { nextStep, isPageLoading } = props;

  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (_data, _context) => {
      nextStep();
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });

  const handleNextStep = () => {
    updateProfileMutation.mutate({
      metadata: {
        currentOnboardingStep: "setup-availability",
      },
    });
  };

  const { data: queryConnectedVideoApps, isPending } = trpc.viewer.apps.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: false,

    /**
     * Both props together sort by most popular first, then by installed first.
     * So, installed apps are always shown at the top, followed by remaining apps sorted by descending popularity.
     *
     * This is done because there could be not so popular app already installed by the admin(e.g. through Delegation Credential)
     * and we want to show it at the top so that user can set it as default if he wants to.
     */
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });
  const { data } = useMeQuery();
  const { t } = useLocale();

  console.log("Data is: ", data);
  const metadata = userMetadata.parse(data?.metadata);

  const hasAnyInstalledVideoApps = queryConnectedVideoApps?.items.some(
    (item) => item.userCredentialIds.length > 0
  );

  const defaultConferencingApp = metadata?.defaultConferencingApp?.appSlug;
  return (
    <>
      {!isPending && (
        <List className="bg-default border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y !overflow-y-scroll rounded-md border p-0 sm:mx-0">
          {queryConnectedVideoApps?.items &&
            queryConnectedVideoApps?.items.map((item) => {
              if (item.slug === "daily-video") return null; // we dont want to show daily here as it is installed by default
              return (
                <li key={item.name}>
                  {item.name && item.logo && (
                    <AppConnectionItem
                      type={item.type}
                      title={item.name}
                      isDefault={item.slug === defaultConferencingApp}
                      description={item.description}
                      dependencyData={item.dependencyData}
                      logo={item.logo}
                      slug={item.slug}
                      installed={item.userCredentialIds.length > 0}
                      defaultInstall={
                        !defaultConferencingApp && item.appData?.location?.linkType === "dynamic"
                      }
                    />
                  )}
                </li>
              );
            })}
        </List>
      )}

      {isPending && <StepConnectionLoader />}
      <Button
        color="primary"
        EndIcon="arrow-right"
        data-testid="save-video-button"
        className={cn(
          "mt-8 flex w-full flex-row justify-center rounded-md border text-center text-sm",
          !hasAnyInstalledVideoApps ? "cursor-not-allowed opacity-20" : ""
        )}
        disabled={!hasAnyInstalledVideoApps}
        loading={isPageLoading}
        onClick={() => {
          handleNextStep();
          nextStep();
        }}>
        {t("next_step_text")}
      </Button>
    </>
  );
};

export { ConnectedVideoStep };
