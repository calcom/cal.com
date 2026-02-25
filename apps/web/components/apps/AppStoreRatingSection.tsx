"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextAreaField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={readonly ? "cursor-default" : "cursor-pointer"}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => onChange?.(star)}>
          <Icon
            name="star"
            className={`${sizeClass} ${
              star <= (hoverValue || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AppStoreRatingSection({ appSlug }: { appSlug: string }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingsQuery = trpc.viewer.apps.appRatings.useQuery({ appSlug });
  const submitMutation = trpc.viewer.apps.submitAppRating.useMutation({
    onSuccess: () => {
      showToast(t("rating_submitted_pending_approval"), "success");
      setRating(0);
      setComment("");
      setIsSubmitting(false);
      utils.viewer.apps.appRatings.invalidate({ appSlug });
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      showToast(t("please_select_a_rating"), "error");
      return;
    }
    setIsSubmitting(true);
    submitMutation.mutate({ appSlug, rating, comment: comment || undefined });
  };

  const data = ratingsQuery.data;

  return (
    <div className="mt-8">
      <h4 className="text-emphasis mb-4 font-semibold">{t("ratings_and_reviews")}</h4>

      {data && data.totalRatings > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <StarRating value={Math.round(data.averageRating)} readonly size="sm" />
            <span className="text-emphasis ml-1 text-sm font-medium">{data.averageRating.toFixed(1)}</span>
          </div>
          <span className="text-subtle text-sm">
            ({data.totalRatings} {data.totalRatings === 1 ? t("review") : t("reviews")})
          </span>
        </div>
      )}

      {data?.userRating && (
        <div className="bg-subtle mb-4 rounded-md p-3">
          <p className="text-subtle text-xs">
            {data.userRating.approved ? t("your_review_is_live") : t("your_review_is_pending_approval")}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <StarRating value={data.userRating.rating} readonly size="sm" />
            {data.userRating.comment && (
              <span className="text-default text-sm">{data.userRating.comment}</span>
            )}
          </div>
        </div>
      )}

      {!data?.userRating && (
        <div className="border-subtle mb-6 rounded-md border p-4">
          <p className="text-emphasis mb-2 text-sm font-medium">{t("rate_this_app")}</p>
          <StarRating value={rating} onChange={setRating} />
          <div className="mt-3">
            <TextAreaField
              name="rating-comment"
              placeholder={t("write_a_review_optional")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            className="mt-2"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={rating === 0 || isSubmitting}>
            {t("submit_review")}
          </Button>
        </div>
      )}

      {data?.ratings && data.ratings.length > 0 && (
        <div className="space-y-4">
          {data.ratings.map((review) => (
            <div key={review.id} className="border-subtle border-b pb-4 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-emphasis text-sm font-medium">
                  {review.user.name || t("anonymous")}
                </span>
                <StarRating value={review.rating} readonly size="sm" />
                <span className="text-subtle text-xs">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && <p className="text-default mt-1 text-sm">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
