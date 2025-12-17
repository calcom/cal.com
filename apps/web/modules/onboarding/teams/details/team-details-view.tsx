"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Avatar } from "@calcom/ui/components/avatar";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Textarea } from "@coss/ui/components/textarea";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingBrowserView } from "../../components/onboarding-browser-view";
import { useCreateTeam } from "../../hooks/useCreateTeam";
import { useOnboardingStore } from "../../store/onboarding-store";
import { ValidatedTeamSlug } from "./validated-team-slug";

type TeamDetailsViewProps = {
  userEmail: string;
};

export const TeamDetailsView = ({ userEmail }: TeamDetailsViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const store = useOnboardingStore();
  const { teamDetails, teamBrand, setTeamDetails, setTeamBrand } = store;
  const { createTeam, isSubmitting } = useCreateTeam();

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

  const handleContinue = async (e?: FormEvent) => {
    e?.preventDefault();

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

    // Create the team (will handle payment redirect if needed)
    // Don't pass store - let createTeam read the latest state from the store
    await createTeam();
  };

  return (
    <>
      <OnboardingLayout userEmail={userEmail} currentStep={1} totalSteps={3}>
        {/* Left column - Main content */}
        <div className="flex h-full w-full flex-col gap-4">
          <form onSubmit={handleContinue} className="flex h-full w-full flex-col gap-4">
            <OnboardingCard
              title={t("create_your_team")}
              subtitle={t("team_onboarding_details_subtitle")}
              footer={
                <div className="flex w-full items-center justify-end gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-[10px]"
                    onClick={() => router.push("/onboarding/getting-started")}>
                    {t("back")}
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    className="rounded-[10px]"
                    disabled={!isSlugValid || !teamName || !teamSlug || isSubmitting}>
                    {t("continue")}
                  </Button>
                </div>
              }>
              <div className="flex h-full w-full flex-col gap-4">
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
                  <p className="text-subtle text-xs font-normal leading-3">
                    {t("onboarding_logo_size_hint")}
                  </p>
                </div>

                {/* Team Name */}
                <div className="flex w-full flex-col gap-1.5">
                  <Label className="text-emphasis mb-0 text-sm font-medium leading-4">{t("team_name")}</Label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Acme Inc."
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
                  <Label className="text-emphasis mb-0 text-sm font-medium leading-4">{t("team_bio")}</Label>
                  <Textarea
                    value={teamBio}
                    onChange={(e) => setTeamBio(e.target.value)}
                    placeholder={t("team_bio_placeholder")}
                  />
                </div>
              </div>
            </OnboardingCard>
          </form>
        </div>

        {/* Right column - Browser view */}
        <OnboardingBrowserView teamSlug={teamSlug} name={teamName} bio={teamBio} avatar={teamLogo || null} />
      </OnboardingLayout>
    </>
  );
};
