"use client";

import type { RowSelectionState } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import type { AbuseRuleField, AbuseRuleOperator } from "@calcom/features/abuse-scoring/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import { DataTableSelectionBar, DataTableWrapper } from "@calcom/web/modules/data-table/components";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useDataTable } from "~/data-table/hooks/useDataTable";

import type { AbuseRuleRow } from "./AbuseRulesColumns";
import { useAbuseRulesColumns } from "./AbuseRulesColumns";
import type { CreateAbuseRuleFormData } from "./CreateAbuseRuleDialog";
import { CreateAbuseRuleDialog } from "./CreateAbuseRuleDialog";

function AbuseRulesContent() {
  const { t } = useLocale();
  const { limit, offset } = useDataTable();
  const utils = trpc.useUtils();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editRule, setEditRule] = useState<AbuseRuleRow | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AbuseRuleRow | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data, isPending } = trpc.viewer.admin.abuseRules.list.useQuery(
    { limit, offset },
    { placeholderData: keepPreviousData }
  );

  // Fetch full details when editing
  const { data: editDetails } = trpc.viewer.admin.abuseRules.getDetails.useQuery(
    { id: editRule?.id ?? "" },
    { enabled: !!editRule }
  );

  const invalidateList = () => utils.viewer.admin.abuseRules.list.invalidate();

  const createRule = trpc.viewer.admin.abuseRules.create.useMutation({
    onSuccess: async () => {
      await invalidateList();
      showToast(t("abuse_rule_created"), "success");
      setShowCreateDialog(false);
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const updateRule = trpc.viewer.admin.abuseRules.update.useMutation({
    onSuccess: async () => {
      await invalidateList();
      showToast(t("abuse_rule_updated"), "success");
      setEditRule(null);
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const deleteRule = trpc.viewer.admin.abuseRules.delete.useMutation({
    onSuccess: async () => {
      await invalidateList();
      showToast(t("abuse_rule_deleted"), "success");
      setRuleToDelete(null);
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const bulkDelete = trpc.viewer.admin.abuseRules.bulkDelete.useMutation({
    onSuccess: async () => {
      await invalidateList();
      showToast(t("abuse_rules_deleted"), "success");
      table.toggleAllPageRowsSelected(false);
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const toggleEnabled = trpc.viewer.admin.abuseRules.update.useMutation({
    onSuccess: async () => {
      await invalidateList();
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const toMutationInput = (formData: CreateAbuseRuleFormData) => ({
    ...formData,
    weight: formData.autoLock ? 0 : formData.weight,
  });

  const handleCreate = (formData: CreateAbuseRuleFormData) => {
    createRule.mutate(toMutationInput(formData));
  };

  const handleUpdate = (formData: CreateAbuseRuleFormData) => {
    if (!editRule) return;
    updateRule.mutate({ id: editRule.id, ...toMutationInput(formData) });
  };

  const handleToggleEnabled = useCallback(
    (rule: AbuseRuleRow) => {
      toggleEnabled.mutate({ id: rule.id, enabled: !rule.enabled });
    },
    [toggleEnabled]
  );

  const columns = useAbuseRulesColumns({
    t,
    onEdit: setEditRule,
    onDelete: setRuleToDelete,
    onToggleEnabled: handleToggleEnabled,
  });

  const flatData = useMemo(() => data?.rows ?? [], [data]);
  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRowCount / limit),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getRowId: (row) => String(row.id),
  });

  const numberOfSelectedRows = table.getFilteredSelectedRowModel().rows.length;
  const selectedIds = table.getSelectedRowModel().flatRows.map((row) => row.original.id);

  const editDefaults = useMemo(
    () =>
      editDetails
        ? {
            description: editDetails.description ?? "",
            matchAll: editDetails.matchAll,
            weight: editDetails.weight,
            autoLock: editDetails.autoLock,
            enabled: editDetails.enabled,
            conditions: editDetails.conditions.map((c) => ({
              field: c.field as AbuseRuleField,
              operator: c.operator as AbuseRuleOperator,
              value: c.value,
            })),
          }
        : undefined,
    [editDetails]
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button color="primary" StartIcon="plus" onClick={() => setShowCreateDialog(true)}>
          {t("add")}
        </Button>
      </div>

      <DataTableWrapper
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        totalRowCount={totalRowCount}
        EmptyView={
          <EmptyScreen
            Icon="shield"
            headline={t("no_abuse_rules")}
            description={t("no_abuse_rules_description")}
            className="bg-muted mb-16"
            buttonRaw={
              <Button StartIcon="plus" onClick={() => setShowCreateDialog(true)} color="primary">
                {t("create_abuse_rule")}
              </Button>
            }
          />
        }>
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            <DataTableSelectionBar.Button
              onClick={() => bulkDelete.mutate({ ids: selectedIds })}
              icon="trash"
              loading={bulkDelete.isPending}
              color="destructive">
              {t("delete")}
            </DataTableSelectionBar.Button>
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>

      {/* Create dialog */}
      <CreateAbuseRuleDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
        isPending={createRule.isPending}
      />

      {/* Edit dialog — only render when details are fetched to avoid stale defaults */}
      {editRule && editDefaults && (
        <CreateAbuseRuleDialog
          isOpen
          onClose={() => setEditRule(null)}
          onSubmit={handleUpdate}
          isPending={updateRule.isPending}
          defaultValues={editDefaults}
          title={t("edit_abuse_rule")}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!ruleToDelete} onOpenChange={() => setRuleToDelete(null)}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_abuse_rule")}
          confirmBtnText={t("delete")}
          isPending={deleteRule.isPending}
          onConfirm={() => {
            if (ruleToDelete) deleteRule.mutate({ id: ruleToDelete.id });
          }}>
          {t("delete_abuse_rule_confirmation", {
            description: ruleToDelete?.description || `Rule #${ruleToDelete?.id}`,
          })}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}

export default function AbuseRulesView() {
  const pathname = usePathname();

  return (
    <DataTableProvider tableIdentifier={pathname ?? "abuse-rules"}>
      <AbuseRulesContent />
    </DataTableProvider>
  );
}
