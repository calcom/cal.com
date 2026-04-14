"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { EllipsisIcon, KeyIcon, PencilIcon, Trash2Icon, UsersIcon } from "@coss/ui/icons";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
  ListItemSpanningTrigger,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { OAuthClientDetails } from "./view/OAuthClientDetailsDialog";

const statusVariantMap: Record<string, "success" | "error" | "warning"> = {
  APPROVED: "success",
  REJECTED: "error",
  PENDING: "warning",
};

const getStatusBadge = (status: string, t: (key: string) => string): ReactNode => {
  const variant = statusVariantMap[status] ?? "warning";
  const label = status === "APPROVED" ? t("approved") : status === "REJECTED" ? t("rejected") : t("pending");
  return (
    <Badge variant={variant} className="pointer-events-none">
      {label}
    </Badge>
  );
};

export const OAuthClientsList = ({
  clients,
  onSelectClient,
  showStatus = true,
  onDelete,
  isDeletePending,
}: {
  clients: OAuthClientDetails[];
  onSelectClient: (client: OAuthClientDetails) => void;
  showStatus?: boolean;
  onDelete?: (clientId: string) => Promise<boolean>;
  isDeletePending?: boolean;
}) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const [deleteTargetClientId, setDeleteTargetClientId] = useState<string | null>(null);

  const basePath = pathname?.startsWith("/settings/admin")
    ? "/settings/admin/oauth"
    : "/settings/developer/oauth";

  const handleConfirmDelete = async () => {
    const clientId = deleteTargetClientId;
    if (!clientId || !onDelete) return;
    if (await onDelete(clientId)) {
      setDeleteTargetClientId(null);
    }
  };

  return (
    <>
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
                      {client.logo ? <AvatarImage alt={client.name} src={client.logo} /> : null}
                      <AvatarFallback>
                        <KeyIcon className="text-muted-foreground" />
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
                <Menu>
                  <Tooltip>
                    <MenuTrigger
                      render={
                        <TooltipTrigger
                          render={
                            <Button
                              aria-label={t("oauth_client_options_aria")}
                              data-testid={`oauth-client-actions-${client.clientId}`}
                              size="icon"
                              variant="outline">
                              <EllipsisIcon />
                            </Button>
                          }
                        />
                      }
                    />
                    <TooltipPopup>{t("options")}</TooltipPopup>
                  </Tooltip>
                  <MenuPopup align="end">
                    <MenuItem onClick={() => onSelectClient(client)}>
                      <PencilIcon />
                      {t("edit")}
                    </MenuItem>
                    <MenuItem
                      data-testid={`oauth-client-users-${client.clientId}`}
                      render={<Link href={`${basePath}/${client.clientId}/users`} />}>
                      <UsersIcon />
                      {t("oauth_authorized_users")}
                    </MenuItem>
                    {onDelete ? (
                      <MenuItem
                        data-testid={`oauth-client-delete-${client.clientId}`}
                        disabled={Boolean(isDeletePending)}
                        onClick={() => setDeleteTargetClientId(client.clientId)}
                        variant="destructive">
                        <Trash2Icon />
                        {t("delete")}
                      </MenuItem>
                    ) : null}
                  </MenuPopup>
                </Menu>
              </ListItemActions>
            </ListItem>
          ))}
        </CardPanel>
      </Card>

      {onDelete ? (
        <AlertDialog
          open={deleteTargetClientId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetClientId(null);
          }}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("delete_oauth_client")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirm_delete_oauth_client")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
              <Button
                type="button"
                variant="destructive"
                data-testid="oauth-client-delete-confirm"
                disabled={Boolean(isDeletePending) || !deleteTargetClientId}
                loading={Boolean(isDeletePending)}
                onClick={handleConfirmDelete}>
                {t("delete")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
    </>
  );
};
