"use client";

import type { Watchlist } from "@calcom/lib/di/watchlist/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

interface SpamBlocklistTableProps {
  spamEntries: Watchlist[];
  onDelete: (entryId: string) => void;
  canEdit: boolean;
}

export default function SpamBlocklistTable({ spamEntries, onDelete, canEdit }: SpamBlocklistTableProps) {
  const { t } = useLocale();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
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
              {t("value")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("description")}
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
                <code className="rounded bg-gray-100 px-2 py-1 text-xs">{entry.value}</code>
              </td>
              <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                {entry.description || "-"}
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
