"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { FieldGrid } from "@coss/ui/shared/field-grid";

export function BillingCreditsSkeleton() {
  const { t } = useLocale();

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>{t("credits")}</CardFrameTitle>
        <CardFrameDescription>{t("view_and_manage_credits")}</CardFrameDescription>
      </CardFrameHeader>
      <Card className="rounded-b-none!">
        <CardPanel>
          <FieldGrid>
            {/* Credits section */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <div>
                <div className="py-2 flex justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-full max-w-64" />
                <Skeleton className="w-28 h-8 sm:h-7 rounded-lg" />
              </div>
            </div>
            {/* Current balance */}
            <Skeleton className="h-4.5 my-0.5 w-32" />
            {/* Fields */}
            <div className="flex flex-col items-start gap-2 md:col-start-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 sm:h-8 w-full rounded-lg" />
              <Skeleton className="h-3 my-0.5 w-48" />
            </div>
            <div className="flex flex-col items-start gap-2 md:col-start-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 sm:h-8 w-full rounded-lg" />
            </div>
          </FieldGrid>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}

