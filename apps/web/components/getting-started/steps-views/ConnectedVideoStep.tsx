import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { List } from "@calcom/ui/components/list";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { AppConnectionItem } from "../components/AppConnectionItem";
import { StepConnectionLoader } from "../components/StepConnectionLoader";

interface ConnectedAppStepProps {
  nextStep: () => void;
  isPageLoading: boolean;
  user: RouterOutputs["viewer"]["me"]["get"];
}

const ConnectedVideoStepInner = ({
  setAnyInstalledVideoApps,
  user,
}: {
  setAnyInstalledVideoApps: Dispatch<SetStateAction<boolean>>;
  user: RouterOutputs["viewer"]["me"]["get"];
}) => {
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

  const hasAnyInstalledVideoApps = queryConnectedVideoApps?.items.some(
    (item) => item.userCredentialIds.length > 0
  );

  useEffect(() => {
    setAnyInstalledVideoApps(Boolean(hasAnyInstalledVideoApps));
  }, [hasAnyInstalledVideoApps, setAnyInstalledVideoApps]);

  if (isPending) {
    return <StepConnectionLoader />;
  }

  const result = userMetadata.safeParse(user.metadata);
  if (!result.success) {
    return <StepConnectionLoader />;
  }
  const { data: metadata } = result;
  const defaultConferencingApp = metadata?.defaultConferencingApp?.appSlug;
  return (
    <List className="bg-default  border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y overflow-y-scroll! rounded-md border p-0 sm:mx-0">
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
                  defaultInstall={!defaultConferencingApp && item.appData?.location?.linkType === "dynamic"}
                />
              )}
            </li>
          );
        })}
    </List>
  );
};

const ConnectedVideoStep = (props: ConnectedAppStepProps) => {
  const { nextStep, isPageLoading, user } = props;
  const { t } = useLocale();
  const [hasAnyInstalledVideoApps, setAnyInstalledVideoApps] = useState(false);
  return (
    <>
      <ConnectedVideoStepInner setAnyInstalledVideoApps={setAnyInstalledVideoApps} user={user} />
      <Button
        EndIcon="arrow-right"
        data-testid="save-video-button"
        className={classNames(
          "text-inverted border-inverted bg-inverted mt-8 flex w-full flex-row justify-center rounded-md border p-2 text-center text-sm",
          !hasAnyInstalledVideoApps ? "cursor-not-allowed opacity-20" : ""
        )}
        disabled={!hasAnyInstalledVideoApps}
        loading={isPageLoading}
        onClick={() => nextStep()}>
        {t("set_availability")}
      </Button>
    </>
  );
};

export { ConnectedVideoStep };
