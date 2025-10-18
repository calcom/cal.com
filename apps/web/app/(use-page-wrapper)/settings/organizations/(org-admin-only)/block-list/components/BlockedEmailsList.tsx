"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui/components/table";
import { Alert } from "@calcom/ui/components/alert";
import { showToast } from "@calcom/ui/components/toast";
import { format } from "date-fns";

interface BlockedEmailsListProps {
    organizationId: number;
}

export function BlockedEmailsList({ organizationId }: BlockedEmailsListProps) {
    const { t } = useLocale();
    const [page, setPage] = useState(0);
    const itemsPerPage = 10;

  const {
    data: blockedEmails,
    isLoading,
    error,
    refetch,
  } = trpc.viewer.organizations.getBlockedEmails.useQuery({
    organizationId,
    skip: page * itemsPerPage,
    take: itemsPerPage,
  });

  const deleteBlockedEmailMutation = trpc.viewer.organizations.deleteBlockedEmail.useMutation({
    onSuccess: () => {
      showToast(t("email_unblocked_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message || t("error_unblocking_email"), "error");
    },
  });

    const handleUnblockEmail = (id: string) => {
        deleteBlockedEmailMutation.mutate({
            id,
            organizationId,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">{t("loading")}...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                severity="error"
                title={t("error_loading_blocked_emails")}
                message={error.message}
            />
        );
    }

    if (!blockedEmails || blockedEmails.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t("no_blocked_emails")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("email")}</TableHead>
                        <TableHead>{t("reason")}</TableHead>
                        <TableHead>{t("blocked_by")}</TableHead>
                        <TableHead>{t("blocked_at")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {blockedEmails.map((email) => (
                        <TableRow key={email.id}>
                            <TableCell>
                                <div className="font-mono text-sm">{email.email}</div>
                            </TableCell>
                            <TableCell>
                                {email.reason ? (
                                    <div className="text-sm text-gray-600">{email.reason}</div>
                                ) : (
                                    <span className="text-sm text-gray-400">{t("no_reason_provided")}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div>
                                    <div className="font-medium">{email.createdBy.name || t("unknown")}</div>
                                    <div className="text-sm text-gray-500">{email.createdBy.email}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-gray-500">
                                    {format(new Date(email.createdAt), "PPp")}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUnblockEmail(email.id)}
                                    disabled={deleteBlockedEmailMutation.isPending}
                                >
                                    {t("unblock")}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="flex justify-between items-center">
                <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                >
                    {t("previous")}
                </Button>
                <span className="text-sm text-gray-500">
                    {t("page")} {page + 1}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!blockedEmails || blockedEmails.length < itemsPerPage}
                >
                    {t("next")}
                </Button>
            </div>
        </div>
    );
}
