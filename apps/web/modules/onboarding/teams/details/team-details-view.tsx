"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField } from "@calcom/ui/components/form";
import { Logo } from "@calcom/ui/components/logo";

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
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      <OnboardingContinuationPrompt />
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">{t("create_your_team")}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("team_onboarding_details_subtitle")}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-default border-muted w-full rounded-[10px] border">
                <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full gap-6 px-5 py-5">
                      <div className="flex w-full flex-col gap-4 rounded-xl">
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  color="primary"
                  className="rounded-[10px]"
                  onClick={handleContinue}
                  disabled={!isSlugValid || !teamName || !teamSlug}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
