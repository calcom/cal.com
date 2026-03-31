"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardPanel } from "@coss/ui/components/card";
import { KeyIcon, SettingsIcon, UsersIcon } from "@coss/ui/icons";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
  ListItemSpanningTrigger,
  ListItemTitle,
} from "@coss/ui/shared/list-item";

import type { OAuthClientDetails } from "./view/OAuthClientDetailsDialog";

const statusVariantMap: Record<string, "success" | "error" | "warning"> = {
  APPROVED: "success",
  REJECTED: "error",
  PENDING: "warning",
};

const getStatusBadge = (status: string, t: (key: string) => string): ReactNode => {
  const variant = statusVariantMap[status] ?? "warning";
  const label =
    status === "APPROVED" ? t("approved") : status === "REJECTED" ? t("rejected") : t("pending");
  return <Badge variant={variant} className="pointer-events-none">{label}</Badge>;
};

export const OAuthClientsList = ({
  clients,
  onSelectClient,
  showStatus = true,
}: {
  clients: OAuthClientDetails[];
  onSelectClient: (client: OAuthClientDetails) => void;
  showStatus?: boolean;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/settings/admin") ? "/settings/admin/oauth" : "/settings/developer/oauth";

  return (
    <Card data-testid="oauth-clients-list">
      <CardPanel className="p-0">
        {clients.map((client) => (
          <ListItem
            key={client.clientId}
            className="*:px-4"
            data-testid={`oauth-client-list-item-${client.clientId}`}>
            <ListItemContent>
              <ListItemHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {client.logo ? (
                      <AvatarImage alt={client.name} src={client.logo} />
                    ) : null}
                    <AvatarFallback className="bg-black/10 dark:bg-white/12">
                      <KeyIcon className="text-muted-foreground size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <ListItemTitle>
                      <ListItemSpanningTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => onSelectClient(client)}
                            aria-label={client.name}
                          />
                        }>
                        {client.name}
                      </ListItemSpanningTrigger>
                    </ListItemTitle>
                    {client.user?.email && (
                      <span className="text-muted-foreground text-xs max-sm:hidden">
                        {client.user.email}
                      </span>
                    )}
                  </div>
                </div>
              </ListItemHeader>
            </ListItemContent>
            <ListItemBadges>
              {showStatus && client.status ? getStatusBadge(client.status, t) : null}
            </ListItemBadges>
            <ListItemActions>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors"
                data-testid={`oauth-client-users-${client.clientId}`}
                onClick={() => router.push(`${basePath}/${client.clientId}/users`)}>
                <UsersIcon className="size-4" />
                {t("users")}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors"
                onClick={() => onSelectClient(client)}>
                <SettingsIcon className="size-4" />
                {t("settings")}
              </button>
            </ListItemActions>
          </ListItem>
        ))}
      </CardPanel>
    </Card>
  );
};
