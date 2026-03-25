"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { revalidateApiKeysList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { toastManager } from "@coss/ui/components/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { EllipsisIcon, PencilIcon, Trash2Icon } from "@coss/ui/icons";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type TApiKeys = RouterOutputs["viewer"]["apiKeys"]["list"][number];

const ApiKeyListItem = ({ apiKey, onEditClick }: { apiKey: TApiKeys; onEditClick: () => void }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isExpired = apiKey?.expiresAt ? apiKey.expiresAt < new Date() : null;
  const neverExpires = apiKey?.expiresAt === null;

  const deleteApiKey = trpc.viewer.apiKeys.delete.useMutation({
    async onSuccess() {
      await utils.viewer.apiKeys.list.invalidate();
      await revalidateApiKeysList();
      router.refresh();
      toastManager.add({ title: t("api_key_deleted"), type: "success" });
    },
    onError(err) {
      console.error(err);
      toastManager.add({ title: t("something_went_wrong"), type: "error" });
    },
  });

  const expirationDescription = neverExpires
    ? t("api_key_never_expires")
    : `${isExpired ? t("expired") : t("expires")} ${dayjs(apiKey?.expiresAt?.toString()).fromNow()}`;

  return (
    <ListItem>
      <ListItemContent>
        <ListItemHeader>
          <ListItemTitle>{apiKey?.note ? apiKey.note : t("api_key_no_note")}</ListItemTitle>
          <ListItemDescription>{expirationDescription}</ListItemDescription>
        </ListItemHeader>
      </ListItemContent>
      <ListItemBadges>
        {!neverExpires && isExpired ? (
          <Badge variant="error" className="pointer-events-none capitalize">
            {t("expired")}
          </Badge>
        ) : (
          <Badge variant="success" className="pointer-events-none capitalize">
            {t("active")}
          </Badge>
        )}
      </ListItemBadges>
      <ListItemActions>
        <Menu>
          <Tooltip>
            <MenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={`Options for ${apiKey?.note || "API key"}`}
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
            <MenuItem onClick={onEditClick}>
              <PencilIcon />
              {t("edit")}
            </MenuItem>
            <MenuItem
              disabled={deleteApiKey.isPending}
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive">
              <Trash2Icon />
              {t("delete")}
            </MenuItem>
          </MenuPopup>
        </Menu>
      </ListItemActions>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_api_key_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete_api_key_warning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
            <AlertDialogClose
              onClick={() => {
                deleteApiKey.mutate({ id: apiKey.id });
              }}
              render={<Button variant="destructive" />}>
              {t("confirm_delete_api_key")}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </ListItem>
  );
};

export default ApiKeyListItem;
