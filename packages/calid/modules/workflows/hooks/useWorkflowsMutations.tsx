import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

export const useWorkflowMutations = (filters: any) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Create workflow mutation
  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace(`/workflows/${workflow.id}`);
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
  const toggleMutation = trpc.viewer.workflows.toggle.useMutation({
    onMutate: async ({ id, disabled }) => {
      await utils.viewer.workflows.filteredList.cancel();
      const previousData = utils.viewer.workflows.filteredList.getData({ filters });

      utils.viewer.workflows.filteredList.setData({ filters }, (old) => {
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
        utils.viewer.workflows.filteredList.setData({ filters }, context.previousData);
      }

      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      } else {
        showToast("Failed to update workflow", "error");
      }
    },
    onSettled: () => {
      utils.viewer.workflows.filteredList.invalidate();
    },
  });

  // Duplicate workflow mutation
  const duplicateMutation = trpc.viewer.workflows.duplicate.useMutation({
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
  const handleCreateWorkflow = useCallback(() => {
    createMutation.mutate({ teamId: undefined });
  }, [createMutation]);

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
    },
  };
};
