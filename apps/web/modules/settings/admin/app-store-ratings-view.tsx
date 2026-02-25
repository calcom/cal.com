"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="star"
          className={`h-4 w-4 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

const AppStoreRatingsView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.viewer.admin.listPendingAppRatings.useQuery({
    take: pageSize,
    skip: page * pageSize,
  });

  const approveMutation = trpc.viewer.admin.approveAppRating.useMutation({
    onSuccess: () => {
      showToast(t("rating_approved"), "success");
      utils.viewer.admin.listPendingAppRatings.invalidate();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const rejectMutation = trpc.viewer.admin.rejectAppRating.useMutation({
    onSuccess: () => {
      showToast(t("rating_rejected"), "success");
      utils.viewer.admin.listPendingAppRatings.invalidate();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  if (isLoading) {
    return <div className="text-subtle p-4 text-sm">{t("loading")}</div>;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-subtle flex flex-col items-center justify-center py-12 text-center">
          <Icon name="star" className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium">{t("no_pending_ratings")}</p>
          <p className="text-sm">{t("no_pending_ratings_description")}</p>
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm">
            <Badge variant="gray">
              {total} {t("pending")}
            </Badge>
          </div>
          <div className="divide-subtle divide-y">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="blue">{item.appSlug}</Badge>
                    <StarDisplay value={item.rating} />
                  </div>
                  <p className="text-emphasis text-sm font-medium">{item.user.name || item.user.email}</p>
                  {item.comment && <p className="text-default mt-1 text-sm">{item.comment}</p>}
                  <p className="text-subtle mt-1 text-xs">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    color="secondary"
                    StartIcon="check"
                    loading={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ id: item.id })}>
                    {t("approve")}
                  </Button>
                  <Button
                    size="sm"
                    color="destructive"
                    StartIcon="x"
                    loading={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: item.id })}>
                    {t("reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button size="sm" color="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t("previous")}
              </Button>
              <span className="text-subtle text-sm">
                {t("page")} {page + 1} / {totalPages}
              </span>
              <Button
                size="sm"
                color="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}>
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppStoreRatingsView;
