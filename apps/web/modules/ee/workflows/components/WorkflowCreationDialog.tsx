import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import cn from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";
import { RadioGroup, Radio, RadioIndicator } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";

type WorkflowOptionCardProps = {
  title: string;
  description: string;
  icon?: IconName;
  isSelected: boolean;
  onClick: () => void;
  iconWrapperClassName?: string;
  image?: string;
  value: "scratch" | "calai";
};

function WorkflowOptionCard(props: WorkflowOptionCardProps) {
  const { title, description, icon, isSelected, onClick, image, iconWrapperClassName, value } = props;

  return (
    <div
      data-testid={`workflow-option-card-${value}`}
      onClick={onClick}
      className={cn(
        `relative flex flex-1 cursor-pointer flex-col rounded-lg border p-4 transition-colors`,
        isSelected ? "border-brand-default" : "border-subtle hover:border-emphasis"
      )}>
      <div className="absolute right-3 top-3">
        <Radio value={value} aria-label={title}>
          <RadioIndicator />
        </Radio>
      </div>
      <div className="flex flex-col">
        <div
          className={cn(
            "mb-5 flex h-10 w-10 items-center justify-center rounded-lg border",
            iconWrapperClassName
          )}>
          {image ? (
            <img
              src={image}
              alt=""
              role="presentation"
              aria-hidden="true"
              className={cn("text-default h-5 w-5")}
            />
          ) : (
            <Icon name={icon || "circle-plus"} className={cn("text-default h-5 w-5")} aria-hidden="true" />
          )}
        </div>
        <h3 className="text-emphasis text-sm font-semibold">{title}</h3>
        <p className="text-subtle text-sm">{description}</p>
      </div>
    </div>
  );
}

type WorkflowCreationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: number;
  onSuccess?: () => void;
};

export function WorkflowCreationDialog({
  open,
  onOpenChange,
  teamId,
  onSuccess,
}: WorkflowCreationDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<"scratch" | "calai">("scratch");
  const [isLoading, setIsLoading] = useState(false);
  const handleOptionChange = (value: string) => {
    if (value === "scratch" || value === "calai") {
      setSelectedOption(value);
    }
  };

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace(`/workflows/${workflow.id}`);
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("unauthorized_create_workflow")}`;
        showToast(message, "error");
      }
    },
  });

  const handleContinue = () => {
    if (selectedOption === "scratch") {
      createMutation.mutate({ teamId });
    } else if (selectedOption === "calai") {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        action: "calAi",
        templateWorkflowId: "wf-11",
        ...(teamId && { teamId: teamId.toString() }),
      });
      router.push(`/workflow/new?${queryParams.toString()}`);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("new_workflow_btn")}
        description={t("how_would_you_like_to_start")}
        type="creation"
        enableOverflow
        Icon="zap">
        <RadioGroup
          value={selectedOption}
          onValueChange={handleOptionChange}
          aria-label={t("new_workflow_btn")}>
          <div className="mt-6 flex gap-4">
            <WorkflowOptionCard
              title={t("start_from_scratch_title")}
              description={t("start_from_scratch_description")}
              icon="circle-plus"
              isSelected={selectedOption === "scratch"}
              onClick={() => setSelectedOption("scratch")}
              iconWrapperClassName="bg-cal-muted"
              value="scratch"
            />
            <WorkflowOptionCard
              title={t("cal_ai_template_title")}
              description={t("cal_ai_template_description")}
              image="/call-outgoing.svg"
              isSelected={selectedOption === "calai"}
              onClick={() => setSelectedOption("calai")}
              iconWrapperClassName="bg-[#2A2947]"
              value="calai"
            />
          </div>
        </RadioGroup>

        <DialogFooter className="relative" showDivider>
          <Button type="button" color="minimal" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            data-testid="continue-button"
            type="button"
            onClick={handleContinue}
            loading={createMutation.isPending || isLoading}>
            {t("continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useWorkflowCreation() {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<number | undefined>(undefined);

  const openDialog = (teamId?: number) => {
    setPendingTeamId(teamId);
    setShowDialog(true);
    posthog.capture("create_new_workflow_button_clicked", { teamId });
  };

  return {
    showDialog,
    setShowDialog,
    pendingTeamId,
    openDialog,
  };
}
