import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { List } from "@calcom/ui/components/list";
import useCalendlyImport from "@calcom/web/lib/hooks/useCalendlyImport";

import { AppConnectionItem } from "../components/AppConnectionItem";
import { StepConnectionLoader } from "../components/StepConnectionLoader";

interface ConnectedAppStepProps {
  nextStep: () => void;
  isPageLoading: boolean;
  userId?: number;
}

const ConnectedVideoStep = ({ ...props }: ConnectedAppStepProps) => {
  const { nextStep, isPageLoading, userId } = props;
  const searchParams = useSearchParams();
  const [isCalendlyAuthorized, setIsCalendlyAuthorized] = useState<boolean | null>(null);
  const hasCheckedCalendlyRef = useRef(false);
  const hasImportedAndFinishedRef = useRef(false);

  const { importFromCalendly, importing, sendCampaignEmails, handleChangeNotifyUsers } = useCalendlyImport(
    userId ?? 0
  );

  // Check if user has Calendly connected (for "Import from Calendly and finish" button)
  useEffect(() => {
    if (!userId || hasCheckedCalendlyRef.current) return;
    hasCheckedCalendlyRef.current = true;

    fetch(`/api/import/calendly/auth?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setIsCalendlyAuthorized(data.authorized))
      .catch(() => setIsCalendlyAuthorized(false));
  }, [userId]);

  // When returning from Calendly OAuth with redirected=1, auto-import and finish
  useEffect(() => {
    if (!userId || !isCalendlyAuthorized || hasImportedAndFinishedRef.current) return;
    const redirected = searchParams.get("redirected");
    if (redirected !== "1") return;

    hasImportedAndFinishedRef.current = true;
    importFromCalendly().then(() => nextStep());
  }, [userId, isCalendlyAuthorized, searchParams, importFromCalendly, nextStep]);

  const handleImportFromCalendlyAndFinish = () => {
    if (!userId) return;

    if (isCalendlyAuthorized) {
      importFromCalendly().then(() => nextStep());
    } else {
      const redirectUri = process.env.NEXT_PUBLIC_CALENDLY_REDIRECT_URI ?? "";
      const location = `${process.env.NEXT_PUBLIC_CALENDLY_OAUTH_URL}/authorize?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        state: `onboarding_finish_${userId}`,
      })}`;
      window.location.href = location;
    }
  };

  const { data: queryConnectedVideoApps, isPending } = trpc.viewer.apps.calid_integrations.useQuery({
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

  const defaultConferencingApp = metadata?.defaultConferencingApp?.appSlug;
  return (
    <>
      {!isPending && (
        <List className="bg-default border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y !overflow-y-scroll rounded-md border p-0 sm:mx-0">
          {queryConnectedVideoApps?.items &&
            queryConnectedVideoApps?.items.map((item) => {
              // if (item.slug === "daily-video") return null; // we dont want to show daily here as it is installed by default

              if (item.slug === "daily-video" || item.slug === "jitsi") return null; // we dont want to show daily/jitsi here as it is installed by default
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
      <div className="mt-8 flex flex-col gap-4">
        <Button
          color="primary"
          data-testid="finish-setup-button"
          className={cn(
            "bg-active border-active dark:border-default flex w-full flex-row justify-center rounded-md border text-center text-sm dark:bg-gray-200"
          )}
          loading={isPageLoading}
          onClick={() => {
            nextStep();
          }}>
          {t("finish")}
        </Button>
        <span className="text-subtle flex justify-center text-center text-sm">{t("or")}</span>
        {userId && (
          <div className="flex flex-col items-center gap-3">
            <Button
              color="primary"
              data-testid="import-from-calendly-and-finish-button"
              className={cn(
                "bg-active border-active dark:border-default flex w-full flex-row justify-center rounded-md border text-center text-sm dark:bg-gray-200"
              )}
              loading={importing}
              disabled={importing || isPageLoading}
              onClick={handleImportFromCalendlyAndFinish}>
              {t("calendly_import")}
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={sendCampaignEmails}
                onCheckedChange={(checked) => handleChangeNotifyUsers(!!checked)}
              />
              <span className="text-subtle text-sm">{t("notify_calendly_import")}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export { ConnectedVideoStep };
