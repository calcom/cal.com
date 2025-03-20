import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Icon } from "@calcom/ui/components/icon";
import { List } from "@calcom/ui/components/list";
import classNames from "@calcom/ui/classNames";

import { AppConnectionItem } from "../components/AppConnectionItem";
import { StepConnectionLoader } from "../components/StepConnectionLoader";

interface ConnectedAppStepProps {
  nextStep: () => void;
}

const ConnectedVideoStep = (props: ConnectedAppStepProps) => {
  const { nextStep } = props;
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

  const metadata = userMetadata.parse(data?.metadata);

  const hasAnyInstalledVideoApps = queryConnectedVideoApps?.items.some(
    (item) => item.userCredentialIds.length > 0
  );

  const defaultConferencingApp = metadata?.defaultConferencingApp?.appSlug;
  return (
    <>
      {!isPending && (
        <List className="bg-default  border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y !overflow-y-scroll rounded-md border p-0 sm:mx-0">
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
      <button
        type="button"
        data-testid="save-video-button"
        className={classNames(
          "text-inverted border-inverted bg-inverted mt-8 flex w-full flex-row justify-center rounded-md border p-2 text-center text-sm",
          !hasAnyInstalledVideoApps ? "cursor-not-allowed opacity-20" : ""
        )}
        disabled={!hasAnyInstalledVideoApps}
        onClick={() => nextStep()}>
        {t("next_step_text")}
        <Icon name="arrow-right" className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </button>
    </>
  );
};

export { ConnectedVideoStep };
