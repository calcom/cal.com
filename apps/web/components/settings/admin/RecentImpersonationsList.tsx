"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecentImpersonations, type RecentImpersonation } from "@calcom/lib/recentImpersonations";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableNew,
  TableRow,
} from "@calcom/ui/components/table";
import { signIn } from "next-auth/react";
import { useState } from "react";

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
    <PanelCard title={t("recent_impersonations")}>
      <div className="overflow-x-auto">
        <TableNew className="border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">User</TableHead>
              <TableHead>Impersonated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentImpersonations.map((impersonation) => (
              <TableRow key={impersonation.username}>
                <TableCell className="font-medium">{impersonation.username}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(impersonation.timestamp).toLocaleDateString()}{" "}
                  {new Date(impersonation.timestamp).toLocaleTimeString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    onClick={() => handleQuickImpersonate(impersonation.username)}
                    data-testid={`quick-impersonate-${impersonation.username}`}>
                    {t("quick_impersonate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableNew>
      </div>
    </PanelCard>
  );
}
