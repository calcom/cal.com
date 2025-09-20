"use client";

import type { Watchlist } from "@calcom/lib/di/watchlist/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

interface SpamBlocklistTableProps {
  spamEntries: Watchlist[];
  onDelete: (entryId: string) => void;
  canEdit: boolean;
  currentUserId: number;
}

export default function SpamBlocklistTable({
  spamEntries,
  onDelete,
  canEdit,
  currentUserId: _currentUserId,
}: SpamBlocklistTableProps) {
  const { t } = useLocale();

  // Get user details for created by info
  const { data: members } = trpc.viewer.organizations.getMembers.useQuery(
    { organizationId: spamEntries[0]?.organizationId ?? 0 },
    { enabled: spamEntries.length > 0 }
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getUserName = (userId: number) => {
    if (!members || !Array.isArray(members)) return t("unknown_user");
    const member = members.find((m) => m.user.id === userId);
    return member ? member.user.name || member.user.email : t("unknown_user");
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("type")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("email")} / {t("domain")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("description")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("status")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("blocked_by")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("date_added")}
            </th>
            {canEdit && (
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("actions")}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {spamEntries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <Badge variant={entry.type === "EMAIL" ? "blue" : "green"}>
                  {entry.type === "EMAIL" ? t("email") : t("domain")}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">{entry.value}</code>
              </td>
              <td className="max-w-xs px-6 py-4 text-sm text-gray-500">
                <div className="truncate" title={entry.description || ""}>
                  {entry.description || "-"}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Badge variant="red">{t("blocked")}</Badge>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {getUserName(entry.createdById)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(entry.createdAt)}
              </td>
              {canEdit && (
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <Button
                    variant="icon"
                    color="destructive"
                    StartIcon="trash-2"
                    onClick={() => onDelete(entry.id)}
                    tooltip={t("delete_spam_entry")}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
