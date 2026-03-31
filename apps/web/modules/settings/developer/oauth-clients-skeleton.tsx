"use client";

import { Card, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
} from "@coss/ui/shared/list-item";

export const OAuthClientsSkeleton = () => {
  return (
    <Card>
      <CardPanel className="p-0">
        <OAuthClientSkeletonRow />
        <OAuthClientSkeletonRow />
        <OAuthClientSkeletonRow />
      </CardPanel>
    </Card>
  );
};

function OAuthClientSkeletonRow() {
  return (
    <ListItem className="*:px-4">
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-5 sm:h-4.5 w-40" />
          </div>
        </ListItemHeader>
      </ListItemContent>
      <ListItemBadges>
        <Skeleton className="h-5.5 w-16 shrink-0 sm:h-4.5" />
      </ListItemBadges>
      <ListItemActions>
        <Skeleton className="size-4 shrink-0" />
      </ListItemActions>
    </ListItem>
  );
}
