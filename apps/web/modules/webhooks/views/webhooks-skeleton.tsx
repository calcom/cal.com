"use client";

import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
} from "@coss/ui/shared/list-item";
import { WebhooksHeader } from "./webhooks-header";

export const SkeletonLoader = () => {
  return (
    <>
      <WebhooksHeader />
      <div className="flex flex-col gap-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <CardFrame>
            <Card className="[--card:var(--popover)]">
              <CardPanel className="p-0">
                <WebhookListItemSkeleton />
                <WebhookListItemSkeleton />
                <WebhookListItemSkeleton />
              </CardPanel>
            </Card>
          </CardFrame>
        </section>
      </div>
    </>
  );
};

function WebhookListItemSkeleton() {
  return (
    <ListItem className="*:px-4">
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="my-0.5 h-5 w-full max-w-[70%] shrink-0 truncate sm:h-4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 shrink-0 sm:h-4.5" />
            </div>
          </div>
        </ListItemHeader>
        <ListItemBadges>
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
          <Skeleton className="h-5.5 w-22 shrink-0 sm:h-4.5 sm:w-20" />
        </ListItemBadges>
      </ListItemContent>
      <ListItemActions>
        <div className="flex items-center gap-4 max-md:hidden">
          <Skeleton className="h-4.5 w-7.5 rounded-full max-md:hidden" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 shrink-0 sm:size-8" />
            <Skeleton className="size-9 shrink-0 sm:size-8" />
          </div>
        </div>
        <Skeleton className="size-9 shrink-0 sm:size-8 md:hidden" />
      </ListItemActions>
    </ListItem>
  );
}
