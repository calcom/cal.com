import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, Label, Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface IDuplicateWorkflowDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  workflowId: number;
}

type TeamOption = {
  label: string;
  value: number | null;
};

export const DuplicateWorkflowDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  workflowId,
}: IDuplicateWorkflowDialog) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch user's teams for the team selector
  const { data: teamsData } = trpc.viewer.teams.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const teamOptions: TeamOption[] = [
    { label: t("personal"), value: null },
    ...(teamsData
      ?.filter((team) => !team.isOrganization)
      .map((team) => ({
        label: team.name,
        value: team.id,
      })) ?? []),
  ];

  const form = useForm({
    defaultValues: {
      targetTeamId: null as number | null,
    },
  });

  const duplicateMutation = trpc.viewer.workflows.duplicate.useMutation({
    onSuccess: async ({ workflow: newWorkflow }) => {
      showToast(t("workflow_duplicated_successfully"), "success");
      await utils.viewer.workflows.filteredList.invalidate();
      router.push(`/workflows/${newWorkflow.id}`);
      setIsOpenDialog(false);
    },
    onError: (err) => {
      showToast(err.message || t("something_went_wrong"), "error");
    },
  });

  const selectedTargetTeamId = form.watch("targetTeamId");

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("duplicate_workflow")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            duplicateMutation.mutate({ id: workflowId, targetTeamId: values.targetTeamId });
          }}>
          <div className="space-y-4">
            {teamOptions.length > 1 && (
              <div>
                <Label>{t("duplicate_to")}</Label>
                <Select<TeamOption>
                  options={teamOptions}
                  value={teamOptions.find((opt) => opt.value === selectedTargetTeamId) ?? teamOptions[0]}
                  onChange={(option) => {
                    if (option) {
                      form.setValue("targetTeamId", option.value);
                    }
                  }}
                  className="mt-1"
                />
              </div>
            )}
            {teamOptions.length <= 1 && <p className="text-sm text-subtle">{t("duplicating_to_personal_account")}</p>}
          </div>
          <DialogFooter showDivider className="mt-10">
            <DialogClose />
            <Button type="submit" loading={duplicateMutation.isPending}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
