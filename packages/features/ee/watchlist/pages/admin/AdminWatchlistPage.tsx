"use client";

import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

export function AdminWatchlistTable() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [data] = trpc.watchlist.admin.listAll.useSuspenseQuery();

  const deleteMutation = trpc.watchlist.admin.delete.useMutation({
    onSuccess: async () => {
      showToast(t("watchlist_entry_deleted"), "success");
      await utils.watchlist.admin.listAll.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const [entryToDelete, setEntryToDelete] = useState<(typeof data)[number] | null>(null);

  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">{t("type")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("value")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("action")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("scope")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">{t("source")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">{t("actions")}</span>
          </ColumnTitle>
        </Header>
        <Body>
          {data.length === 0 ? (
            <Row>
              <Cell colSpan={6}>
                <div className="text-subtle py-8 text-center">{t("no_watchlist_entries")}</div>
              </Cell>
            </Row>
          ) : (
            data.map((entry) => (
              <Row key={entry.id}>
                <Cell widthClassNames="w-auto">
                  <Badge variant="gray">{entry.type}</Badge>
                </Cell>
                <Cell widthClassNames="w-auto">
                  <div>
                    <span className="text-default font-mono text-sm">{entry.value}</span>
                    {entry.description && (
                      <span className="text-subtle block text-xs">{entry.description}</span>
                    )}
                  </div>
                </Cell>
                <Cell widthClassNames="w-auto">
                  <Badge
                    variant={entry.action === "BLOCK" ? "red" : entry.action === "ALERT" ? "orange" : "blue"}>
                    {entry.action}
                  </Badge>
                </Cell>
                <Cell widthClassNames="w-auto">
                  {entry.isGlobal ? (
                    <Badge variant="green">{t("global")}</Badge>
                  ) : (
                    <div>
                      <Badge variant="blue">{t("organization")}</Badge>
                      <span className="text-subtle ml-2 text-xs">#{entry.organizationId}</span>
                    </div>
                  )}
                </Cell>
                <Cell widthClassNames="w-auto">
                  <span className="text-subtle text-sm">
                    {entry.source === "MANUAL" ? t("manual") : t("free_domain_policy")}
                  </span>
                </Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={[
                        {
                          id: "delete",
                          label: t("delete"),
                          onClick: () => setEntryToDelete(entry),
                          icon: "trash" as const,
                        },
                      ]}
                    />
                  </div>
                </Cell>
              </Row>
            ))
          )}
        </Body>
      </Table>
      <DeleteEntryDialog
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={() => {
          if (!entryToDelete) return;
          deleteMutation.mutate({ id: entryToDelete.id });
          setEntryToDelete(null);
        }}
      />
    </div>
  );
}

export default AdminWatchlistTable;

const DeleteEntryDialog = ({
  entry,
  onConfirm,
  onClose,
}: {
  entry: {
    id: string;
    value: string;
  } | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  if (!entry) return null;

  return (
    <Dialog
      name="delete-watchlist-entry"
      open={!!entry.id}
      onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title={t("delete_watchlist_entry")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={onConfirm}>
        <p>
          {t("delete_watchlist_entry_confirmation", {
            value: entry.value,
          })}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};
