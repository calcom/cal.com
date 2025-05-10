import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTableWrapper } from "@calcom/features/data-table";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

type FeedbackData = {
  userId: number | null;
  user: Pick<User, "avatarUrl" | "name">;
  emailMd5?: string;
  username?: string;
  rating: number | null;
  feedback: string | null;
};

export const FeedbackTable = ({
  data,
  totalRowCount,
}: {
  data: FeedbackData[] | undefined;
  totalRowCount: number;
}) => {
  const { t } = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "user",
        accessorFn: (row: FeedbackData) => row.user.name,
        header: t("user"),
        cell: ({ row }: { row: any }) => {
          const item = row.original;
          return (
            <div className="flex flex-row">
              <Avatar
                alt={item.user.name || ""}
                size="sm"
                imageSrc={getUserAvatarUrl({ avatarUrl: item.user.avatarUrl })}
                title={item.user.name || ""}
                className="m-2"
              />
              <p className="text-default mx-0 my-auto">
                <strong>{item.user.name}</strong>
              </p>
            </div>
          );
        },
      },
      {
        id: "rating",
        accessorFn: (row: FeedbackData) => row.rating,
        header: t("rating"),
        cell: ({ row }: { row: any }) => {
          const item = row.original;
          return (
            <div className="text-default">
              <strong>{item.rating}</strong>
            </div>
          );
        },
      },
      {
        id: "feedback",
        accessorFn: (row: FeedbackData) => row.feedback,
        header: t("feedback"),
        cell: ({ row }: { row: any }) => {
          const item = row.original;
          return (
            <div className="text-default">
              <strong>{item.feedback}</strong>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data || data.length === 0) {
    return (
      <EmptyScreen
        Icon="zap"
        headline={t("no_ratings")}
        description={t("no_ratings_description")}
        buttonRaw={
          <Button target="_blank" color="secondary" href="/workflows">
            {t("workflows")}
          </Button>
        }
      />
    );
  }

  return (
    <DataTableWrapper
      table={table}
      isPending={false}
      totalRowCount={totalRowCount}
      paginationMode="standard"
    />
  );
};
