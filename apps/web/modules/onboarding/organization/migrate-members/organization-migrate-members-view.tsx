"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { useMigrationFlow } from "../../hooks/useMigrationFlow";
import { useOnboardingStore } from "../../store/onboarding-store";

type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

type OrganizationMigrateMembersViewProps = {
  userEmail: string;
};

export const OrganizationMigrateMembersView = ({ userEmail }: OrganizationMigrateMembersViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { teams, setMigratedMembers } = useOnboardingStore();

  const teamsToMigrate = teams.filter((team) => team.isBeingMigrated && team.id > 0);
  const teamIds = teamsToMigrate.map((team) => team.id);

  const results = trpc.useQueries((t) => teamIds.map((teamId) => t.viewer.teams.listMembers({ teamId })));

  const isLoading = results.some((result) => result.isLoading);

  const uniqueMembers = results
    .reduce<TeamMember[]>((acc, result) => {
      if (result.data?.members) {
        return [...acc, ...result.data.members];
      }
      return acc;
    }, [])
    .filter((member, index, self) => index === self.findIndex((m) => m.email === member.email));

  const handleContinue = () => {
    const migratedMembersData = uniqueMembers.map((member) => ({
      email: member.email,
      name: member.name || undefined,
      teamId: member.teamId,
    }));

    setMigratedMembers(migratedMembersData);

    const migrateParam = searchParams?.get("migrate");
    const nextUrl = `/onboarding/organization/invite${migrateParam ? `?migrate=${migrateParam}` : ""}`;
    router.push(nextUrl);
  };

  const handleSkip = () => {
    setMigratedMembers([]);
    const migrateParam = searchParams?.get("migrate");
    const nextUrl = `/onboarding/organization/invite${migrateParam ? `?migrate=${migrateParam}` : ""}`;
    router.push(nextUrl);
  };

  if (isLoading) {
    return (
      <OnboardingLayout userEmail={userEmail} currentStep={5} totalSteps={6}>
        <SkeletonContainer as="div" className="stack-y-6">
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
        </SkeletonContainer>
      </OnboardingLayout>
    );
  }

  if (teamsToMigrate.length === 0) {
    return null;
  }

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={5} totalSteps={6}>
      <OnboardingCard
        title={t("migrate_team_members")}
        subtitle={t("members_from_migrated_teams_will_be_included")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={() => {
                const migrateParam = searchParams?.get("migrate");
                const backUrl = `/onboarding/organization/teams${
                  migrateParam ? `?migrate=${migrateParam}` : ""
                }`;
                router.push(backUrl);
              }}>
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
                {t("onboarding_skip_for_now")}
              </Button>
              <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                {t("continue")}
              </Button>
            </div>
          </div>
        }>
        <div className="flex w-full flex-col gap-4">
          {uniqueMembers.length > 0 ? (
            <ul className="border-subtle divide-subtle max-h-[300px] divide-y overflow-y-auto rounded-md border">
              {uniqueMembers.map((member) => (
                <li key={member.email} className="flex items-center justify-between px-5 py-2">
                  <div className="flex items-center space-x-3">
                    <Avatar size="sm" alt={member.email} imageSrc={member.avatarUrl} />
                    <div className="flex gap-1">
                      <Tooltip content={member.email}>
                        <span className="text-emphasis text-sm font-medium">
                          {member.name || member.email}
                        </span>
                      </Tooltip>
                      <Badge variant="green">{t("migrating_from_team")}</Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-subtle text-sm">{t("no_members_to_migrate")}</p>
          )}
        </div>
      </OnboardingCard>
    </OnboardingLayout>
  );
};
