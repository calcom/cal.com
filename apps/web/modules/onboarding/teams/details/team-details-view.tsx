"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField, TextArea } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

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
  const { teamDetails, teamBrand, setTeamDetails, setTeamBrand } = useOnboardingStore();

  const logoRef = useRef<HTMLInputElement>(null);
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamBio, setTeamBio] = useState("");
  const [teamLogo, setTeamLogo] = useState<string>("");
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    setTeamName(teamDetails.name);
    setTeamSlug(teamDetails.slug);
    setTeamBio(teamDetails.bio);
    setTeamLogo(teamBrand.logo || "");
    if (teamDetails.slug) {
      setIsSlugManuallyEdited(true);
    }
  }, [teamDetails, teamBrand]);

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

  const handleLogoChange = (newLogo: string) => {
    if (logoRef.current) {
      logoRef.current.value = newLogo;
    }
    setTeamLogo(newLogo);
  };

  const handleContinue = () => {
    if (!isSlugValid) {
      return;
    }

    setTeamDetails({
      name: teamName,
      slug: teamSlug,
      bio: teamBio,
    });

    setTeamBrand({
      logo: teamLogo || null,
    });

    router.push("/onboarding/teams/invite");
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
            {/* Team Profile Picture */}
            <div className="flex w-full flex-col gap-2">
              <Label className="text-emphasis text-sm font-medium leading-4">{t("team_logo")}</Label>
              <div className="flex flex-row items-center justify-start gap-2 rtl:justify-end">
                <div className="relative shrink-0">
                  <Avatar
                    size="lg"
                    imageSrc={teamLogo || undefined}
                    alt={teamName || "Team"}
                    className="border-2 border-white"
                  />
                </div>
                <input ref={logoRef} type="hidden" name="logo" id="logo" defaultValue={teamLogo} />
                <ImageUploader
                  target="avatar"
                  id="team-logo-upload"
                  buttonMsg={t("upload")}
                  handleAvatarChange={handleLogoChange}
                  imageSrc={teamLogo}
                />
              </div>
              <p className="text-subtle text-xs font-normal leading-3">{t("onboarding_logo_size_hint")}</p>
            </div>

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

            {/* Team Bio */}
            <div className="flex w-full flex-col gap-1.5">
              <Label className="text-emphasis text-sm font-medium leading-4">{t("team_bio")}</Label>
              <TextArea
                value={teamBio}
                onChange={(e) => setTeamBio(e.target.value)}
                placeholder={t("team_bio_placeholder")}
                className="border-default min-h-[80px] rounded-[10px] border px-2 py-1.5 text-sm"
                rows={3}
              />
            </div>
          </div>
        </OnboardingCard>

        {/* Right column - Browser view */}
        <OnboardingBrowserView teamSlug={teamSlug} name={teamName} bio={teamBio} avatar={teamLogo || null} />
      </OnboardingLayout>
    </>
  );
};
