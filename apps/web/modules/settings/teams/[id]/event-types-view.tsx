"use client";

import { useRouter } from "next/navigation";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import { useCreateEventType } from "@calcom/features/eventtypes/hooks/useCreateEventType";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { WizardLayout } from "@calcom/ui/components/layout";
import { showToast } from "@calcom/ui/components/toast";

type CreateTeamEventTypeProps = {
  permissions: { canCreateEventType: boolean };
};

export const CreateTeamEventType = ({ permissions }: CreateTeamEventTypeProps) => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  const onSuccessMutation = () => {
    router.push(`/settings/teams/${teamId}/profile`);
  };

  const onErrorMutation = (err: string) => {
    showToast(err, "error");
  };

  const SubmitButton = (isPending: boolean) => {
    return (
      <Button
        data-testid="finish-button"
        type="submit"
        color="primary"
        className="w-full justify-center"
        disabled={isPending}>
        {t("finish")}
      </Button>
    );
  };

  const { data: team } = trpc.viewer.teams.get.useQuery(
    { teamId: teamId ?? -1, isOrg: false },
    { enabled: !!teamId }
  );

  const { form, createMutation, isManagedEventType } = useCreateEventType(onSuccessMutation, onErrorMutation);

  const orgBranding = useOrgBranding();
  const urlPrefix = orgBranding?.fullDomain ?? process.env.NEXT_PUBLIC_WEBSITE_URL;

  return (
    <TeamEventTypeForm
      teamSlug={team?.slug}
      teamId={teamId}
      permissions={permissions}
      urlPrefix={urlPrefix}
      isPending={createMutation.isPending}
      form={form}
      isManagedEventType={isManagedEventType}
      handleSubmit={(values) => {
        createMutation.mutate(values);
      }}
      SubmitButton={SubmitButton}
    />
  );
};

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  return (
    <WizardLayout
      currentStep={3}
      maxSteps={3}
      isOptionalCallback={() => {
        router.push(`/settings/teams/${teamId}/profile`);
      }}>
      {children}
    </WizardLayout>
  );
};
