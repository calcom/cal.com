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

interface OrgWatchlistTableProps {
  organizationId: number;
  canEdit: boolean;
}

export function OrgWatchlistTable({ organizationId, canEdit }: OrgWatchlistTableProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [data] = trpc.watchlist.organization.list.useSuspenseQuery({ organizationId });

  const deleteMutation = trpc.watchlist.organization.delete.useMutation({
    onSuccess: async () => {
      showToast(t("watchlist_entry_deleted"), "success");
      await utils.watchlist.organization.list.invalidate({ organizationId });
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
          <ColumnTitle widthClassNames="w-auto">{t("source")}</ColumnTitle>
          {canEdit && (
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">{t("actions")}</span>
            </ColumnTitle>
          )}
        </Header>
        <Body>
          {data.length === 0 ? (
            <Row>
              <Cell colSpan={canEdit ? 5 : 4}>
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
                  <span className="text-subtle text-sm">
                    {entry.source === "MANUAL" ? t("manual") : t("free_domain_policy")}
                  </span>
                </Cell>
                {canEdit && (
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
                )}
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
          deleteMutation.mutate({
            id: entryToDelete.id,
            organizationId,
          });
          setEntryToDelete(null);
        }}
      />
    </div>
  );
}

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
