import type { CalIdWorkflow } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { getTimeFormatStringFromUserTimeFormat, TimeFormat } from "@calcom/lib/timeFormat";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { TWorkflowBuilderTemplateFieldsSchema } from "@calcom/trpc/server/routers/viewer/workflows/calid/create.schema";
import { showToast } from "@calcom/ui/components/toast";

import { getTemplateBodyForAction, determineEmailTemplateHandler, isEmailAction } from "../config/utils";
import type { WorkflowTemplate } from "../config/workflow_templates";

export const useWorkflowMutations = (filters: any, onCreateSuccess?: () => void) => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const userQuery = useMeQuery();
  const user = userQuery.data;

  // Create workflow mutation
  const createMutation = trpc.viewer.workflows.calid_create.useMutation({
    onSuccess: async ({ workflow, builderTemplate }) => {
      // Only directly navigate if no builder template is being used, otherwise we'll wait for the update query to also complete
      if (!builderTemplate) {
        await router.replace(`/workflows/${workflow.id}`);
      } else {
        handleUpdateWorkflowFromBuilderTemplate(workflow, builderTemplate);
      }

      console.log("Workflow created", workflow);
      console.log("Builder Template", builderTemplate);

      onCreateSuccess?.();
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  // Toggle workflow mutation
  const toggleMutation = trpc.viewer.workflows.calid_toggle.useMutation({
    onMutate: async ({ id, disabled }) => {
      await utils.viewer.workflows.calid_filteredList.cancel();
      const previousData = utils.viewer.workflows.calid_filteredList.getData({ filters });

      utils.viewer.workflows.calid_filteredList.setData({ filters }, (old) => {
        if (!old) return old;
        return {
          ...old,
          filtered: old.filtered.map((workflow) =>
            workflow.id === id
              ? { ...workflow, disabled: typeof disabled === "boolean" ? disabled : false }
              : workflow
          ),
        };
      });

      return { previousData };
    },
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        utils.viewer.workflows.calid_filteredList.setData({ filters }, context.previousData);
      }

      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      } else {
        showToast("Failed to update workflow", "error");
      }
    },
    onSettled: () => {
      utils.viewer.workflows.calid_filteredList.invalidate();
    },
  });

  // Duplicate workflow mutation
  const duplicateMutation = trpc.viewer.workflows.calid_duplicate.useMutation({
    onSuccess: async ({ workflow }) => {
      router.replace(`/workflows/${workflow.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      } else {
        showToast(t("something_went_wrong"), "error");
      }
    },
  });

  // Handler functions
  const handleCreateWorkflow = useCallback(
    async (teamId?: number, builderTemplate?: WorkflowTemplate) => {
      console.log("Team id: ", teamId);
      console.log("template: ", builderTemplate);
      createMutation.mutate({ calIdTeamId: teamId, builderTemplate });
    },
    [createMutation]
  );

  const updateMutation = trpc.viewer.workflows.calid_update.useMutation({
    onSuccess: async ({ workflow }) => {
      console.log("Workflow updated", workflow);
      if (workflow) {
        utils.viewer.workflows.calid_get.setData({ id: workflow.id }, workflow);

        router.replace(`/workflows/${workflow.id}`);
      }
    },
    onError: (err) => {
      console.error("error: ", err);
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        console.error("error msg: ", message);
      }
    },
  });

  const handleUpdateWorkflowFromBuilderTemplate = useCallback(
    (workflow: CalIdWorkflow, template: TWorkflowBuilderTemplateFieldsSchema) => {
      console.log("Updating workflow from builder template:", workflow, ", ", template);
      const newStep = {
        id: -Date.now(),
        stepNumber: 0,
        action: template.actionType,
        workflowId: workflow.id,
        sendTo: null,
        reminderBody: null,
        emailSubject: null,
        template: template.template,
        numberRequired: false,
        sender: null,
        senderName: null,
        numberVerificationPending: false,
        includeCalendarEvent: false,
        verifiedAt: null,
      };

      console.log("Step : ", newStep);

      const timeFormat = user
        ? getTimeFormatStringFromUserTimeFormat(user.timeFormat)
        : TimeFormat.TWELVE_HOUR;

      const action = newStep.action;
      const locale = i18n.language;
      const _template = newStep.template;

      const templateBody = getTemplateBodyForAction({
        action,
        locale,
        t,
        template: _template,
        timeFormat,
      });

      newStep.reminderBody = templateBody;

      if (isEmailAction(newStep.action)) {
        const templateFunction = determineEmailTemplateHandler(_template);

        newStep.emailSubject = templateFunction({
          isEditingMode: true,
          locale,
          action,
          timeFormat,
        }).emailSubject;
      }

      const updateParams = {
        id: workflow.id,
        name: template.name,
        activeOn: [],
        isActiveOnAll: true,
        steps: [newStep],
        trigger: template.triggerEvent,
        time: template.time,
        timeUnit: "MINUTE",
      };
      console.log("Update mutation params: ", updateParams);

      updateMutation.mutate(updateParams);
    },
    [updateMutation]
  );

  const handleWorkflowEdit = useCallback(
    (workflowId: number) => {
      router.push(`/workflows/${workflowId}`);
    },
    [router]
  );

  const handleWorkflowToggle = useCallback(
    (workflowId: number, enabled: boolean) => {
      toggleMutation.mutate({
        id: workflowId,
        disabled: !enabled,
      });
    },
    [toggleMutation]
  );

  const handleWorkflowDuplicate = useCallback(
    (workflowId: number) => {
      duplicateMutation.mutate({ workflowId });
    },
    [duplicateMutation]
  );

  const handleCopyLink = useCallback(
    (workflowId: number, onSuccess?: () => void) => {
      if (typeof window !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(`${WEBAPP_URL}/workflows/${workflowId}`);
        showToast(t("link_copied"), "success");
        onSuccess?.();
      }
    },
    [t]
  );
  return {
    mutations: {
      create: createMutation,
      toggle: toggleMutation,
      duplicate: duplicateMutation,
    },
    handlers: {
      handleCreateWorkflow,
      handleWorkflowEdit,
      handleWorkflowToggle,
      handleWorkflowDuplicate,
      handleCopyLink,
      handleUpdateWorkflowFromBuilderTemplate,
    },
  };
};
