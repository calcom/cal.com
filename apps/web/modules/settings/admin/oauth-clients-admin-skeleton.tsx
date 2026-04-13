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

export const OAuthClientsAdminSkeleton = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Card>
        <CardPanel className="p-0">
          {Array.from({ length: 5 }, (_, i) => (
            <OAuthClientSkeletonRow key={i} />
          ))}
        </CardPanel>
      </Card>
    </div>
  );
};

function OAuthClientSkeletonRow() {
  return (
    <ListItem className="*:px-4">
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-40 sm:h-4.5" />
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
