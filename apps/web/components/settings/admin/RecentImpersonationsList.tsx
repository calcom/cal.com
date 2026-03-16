"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecentImpersonations, type RecentImpersonation } from "@calcom/lib/recentImpersonations";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";

interface RecentImpersonationsListProps {
  onImpersonate?: (username: string) => void;
}

export default function RecentImpersonationsList({ onImpersonate }: RecentImpersonationsListProps) {
  const { t } = useLocale();
  const [recentImpersonations] = useState<RecentImpersonation[]>(() => getRecentImpersonations());

  const handleQuickImpersonate = (impersonateUsername: string) => {
    if (onImpersonate) {
      onImpersonate(impersonateUsername);
    } else {
      signIn("impersonation-auth", {
        username: impersonateUsername.toLowerCase(),
        callbackUrl: `${WEBAPP_URL}/event-types`,
      });
    }
  };

  if (recentImpersonations.length === 0) {
    return null;
  }

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>{t("recent_impersonations")}</CardFrameTitle>
      </CardFrameHeader>
      <Card>
        <CardPanel className="p-0">
          {recentImpersonations.map((impersonation) => (
            <ListItem key={impersonation.username} className="max-[400px]:*:flex-col max-[400px]:*:items-start">
              <ListItemContent>
                <ListItemHeader>
                  <ListItemTitle>{impersonation.username}</ListItemTitle>
                  <ListItemDescription>
                    {new Date(impersonation.timestamp).toLocaleDateString()}{" "}
                    {new Date(impersonation.timestamp).toLocaleTimeString()}
                  </ListItemDescription>
                </ListItemHeader>
              </ListItemContent>
              <ListItemActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickImpersonate(impersonation.username)}
                  data-testid={`quick-impersonate-${impersonation.username}`}>
                  {t("quick_impersonate")}
                </Button>
              </ListItemActions>
            </ListItem>
          ))}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
