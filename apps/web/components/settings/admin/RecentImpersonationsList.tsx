"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecentImpersonations, type RecentImpersonation } from "@calcom/lib/recentImpersonations";
import { Button } from "@calcom/ui/components/button";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";

interface RecentImpersonationsListProps {
  onImpersonate?: (username: string) => void;
}

export default function RecentImpersonationsList({ onImpersonate }: RecentImpersonationsListProps) {
  const { t } = useLocale();
  const [recentImpersonations] = useState<RecentImpersonation[]>(() => getRecentImpersonations());

  const handleQuickImpersonate = (username: string) => {
    if (onImpersonate) {
      onImpersonate(username);
    } else {
      signIn("impersonation-auth", {
        username: username.toLowerCase(),
        callbackUrl: `${WEBAPP_URL}/event-types`,
      });
    }
  };

  if (recentImpersonations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-emphasis mb-3 text-sm font-semibold">{t("recent_impersonations")}</h3>
      <List>
        {recentImpersonations.map((impersonation) => (
          <ListItem key={impersonation.username} className="flex items-center justify-between">
            <div className="flex-1">
              <ListItemTitle>{impersonation.username}</ListItemTitle>
              <ListItemText>
                {new Date(impersonation.timestamp).toLocaleDateString()}{" "}
                {new Date(impersonation.timestamp).toLocaleTimeString()}
              </ListItemText>
            </div>
            <Button
              type="button"
              variant="button"
              size="sm"
              onClick={() => handleQuickImpersonate(impersonation.username)}
              data-testid={`quick-impersonate-${impersonation.username}`}>
              {t("quick_impersonate")}
            </Button>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
