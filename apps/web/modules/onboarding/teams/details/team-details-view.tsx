"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField } from "@calcom/ui/components/form";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingBrowserView } from "../../components/onboarding-browser-view";
import { OnboardingContinuationPrompt } from "../../components/onboarding-continuation-prompt";
import { useOnboardingStore } from "../../store/onboarding-store";
import { ValidatedTeamSlug } from "./validated-team-slug";

type TeamDetailsViewProps = {
  userEmail: string;
};

export const TeamDetailsView = ({ userEmail }: TeamDetailsViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { teamDetails, setTeamDetails } = useOnboardingStore();

  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    setTeamName(teamDetails.name);
    setTeamSlug(teamDetails.slug);
    if (teamDetails.slug) {
      setIsSlugManuallyEdited(true);
    }
  }, [teamDetails]);

  useEffect(() => {
    if (!isSlugManuallyEdited && teamName) {
      const slugifiedName = slugify(teamName);
      setTeamSlug(slugifiedName);
    }
  }, [teamName, isSlugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setTeamSlug(value);
    setIsSlugManuallyEdited(true);
  };

  const handleContinue = () => {
    if (!isSlugValid) {
      return;
    }

    setTeamDetails({
      name: teamName,
      slug: teamSlug,
    });
    router.push("/onboarding/teams/brand");
  };

  return (
    <>
      <OnboardingContinuationPrompt />
      <OnboardingLayout userEmail={userEmail} currentStep={2}>
        {/* Left column - Main content */}
        <OnboardingCard
          title={t("create_your_team")}
          subtitle={t("team_onboarding_details_subtitle")}
          footer={
            <div className="flex w-full items-center justify-end gap-4">
              <Button
                color="minimal"
                className="rounded-[10px]"
                onClick={() => router.push("/onboarding/getting-started")}>
                {t("back")}
              </Button>
              <Button
                color="primary"
                className="rounded-[10px]"
                onClick={handleContinue}
                disabled={!isSlugValid || !teamName || !teamSlug}>
                {t("continue")}
              </Button>
            </div>
          }>
          <div className="flex w-full flex-col gap-4 px-5">
            {/* Team Name */}
            <div className="flex w-full flex-col gap-1.5">
              <Label className="text-emphasis text-sm font-medium leading-4">{t("team_name")}</Label>
              <TextField
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Acme Inc."
                className="border-default h-7 rounded-[10px] border px-2 py-1.5 text-sm"
              />
            </div>

            {/* Team Slug */}
            <ValidatedTeamSlug
              value={teamSlug}
              onChange={handleSlugChange}
              onValidationChange={setIsSlugValid}
            />
          </div>
        </OnboardingCard>

        {/* Right column - Browser view */}
        <OnboardingBrowserView />
      </OnboardingLayout>
    </>
  );
};
