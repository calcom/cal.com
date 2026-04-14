"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
} from "@coss/ui/shared/list-item";

export const SkeletonLoader = () => {
  const { t } = useLocale();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("api_keys")}>
          <AppHeaderDescription>
            {t("create_first_api_key_description", { appName: APP_NAME })}
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <Card>
        <CardPanel className="p-0">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </CardPanel>
      </Card>
    </>
  );
};

function SkeletonRow() {
  return (
    <ListItem>
      <ListItemContent>
        <ListItemHeader>
          <Skeleton className="h-6 w-32 sm:h-5" data-testid="skeleton-text" />
          <Skeleton className="my-0.5 h-4 w-48" data-testid="skeleton-text" />
        </ListItemHeader>
      </ListItemContent>
      <ListItemBadges>
        <Skeleton className="h-5.5 w-12 sm:h-4.5" data-testid="skeleton-text" />
      </ListItemBadges>
      <ListItemActions>
        <Skeleton className="size-9 rounded-lg sm:size-8" data-testid="skeleton-text" />
      </ListItemActions>
    </ListItem>
  );
}