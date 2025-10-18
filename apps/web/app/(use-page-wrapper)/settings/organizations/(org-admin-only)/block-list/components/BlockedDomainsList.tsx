"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui/components/table";
import { Alert } from "@calcom/ui/components/alert";
import { showToast } from "@calcom/ui/components/toast";
import { format } from "date-fns";

interface BlockedDomainsListProps {
    organizationId: number;
}

export function BlockedDomainsList({ organizationId }: BlockedDomainsListProps) {
    const { t } = useLocale();
    const [page, setPage] = useState(0);
    const itemsPerPage = 10;

  const {
    data: blockedDomains,
    isLoading,
    error,
    refetch,
  } = trpc.viewer.organizations.getBlockedDomains.useQuery({
    organizationId,
    skip: page * itemsPerPage,
    take: itemsPerPage,
  });

  const deleteBlockedDomainMutation = trpc.viewer.organizations.deleteBlockedDomain.useMutation({
    onSuccess: () => {
      showToast(t("domain_unblocked_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message || t("error_unblocking_domain"), "error");
    },
  });

    const handleUnblockDomain = (id: string) => {
        deleteBlockedDomainMutation.mutate({
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
                title={t("error_loading_blocked_domains")}
                message={error.message}
            />
        );
    }

    if (!blockedDomains || blockedDomains.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t("no_blocked_domains")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("domain")}</TableHead>
                        <TableHead>{t("reason")}</TableHead>
                        <TableHead>{t("blocked_by")}</TableHead>
                        <TableHead>{t("blocked_at")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {blockedDomains.map((domain) => (
                        <TableRow key={domain.id}>
                            <TableCell>
                                <div className="font-mono text-sm">{domain.domain}</div>
                            </TableCell>
                            <TableCell>
                                {domain.reason ? (
                                    <div className="text-sm text-gray-600">{domain.reason}</div>
                                ) : (
                                    <span className="text-sm text-gray-400">{t("no_reason_provided")}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div>
                                    <div className="font-medium">{domain.createdBy.name || t("unknown")}</div>
                                    <div className="text-sm text-gray-500">{domain.createdBy.email}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-gray-500">
                                    {format(new Date(domain.createdAt), "PPp")}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUnblockDomain(domain.id)}
                                    disabled={deleteBlockedDomainMutation.isPending}
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
                    disabled={!blockedDomains || blockedDomains.length < itemsPerPage}
                >
                    {t("next")}
                </Button>
            </div>
        </div>
    );
}
