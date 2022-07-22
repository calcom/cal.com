import { PencilAltIcon, TrashIcon } from "@heroicons/react/outline";
import { ExclamationIcon } from "@heroicons/react/solid";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Dialog, DialogTrigger } from "@calcom/ui/Dialog";
import { Tooltip } from "@calcom/ui/Tooltip";

import { ListItem } from "@components/List";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Badge from "@components/ui/Badge";

export type TApiKeys = inferQueryOutput<"viewer.apiKeys.list">[number];

export default function ApiKeyListItem(props: { apiKey: TApiKeys; onEditApiKey: () => void }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const isExpired = props?.apiKey?.expiresAt ? props.apiKey.expiresAt < new Date() : null;
  const neverExpires = props?.apiKey?.expiresAt === null;
  const deleteApiKey = trpc.useMutation("viewer.apiKeys.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.apiKeys.list"]);
    },
  });
  return (
    <ListItem className="flex w-full p-4">
      <div className="flex w-full justify-between">
        <div className="flex max-w-full flex-col truncate">
          <div className="flex space-x-2">
            <span className="text-gray-900">
              {props?.apiKey?.note ? props.apiKey.note : t("api_key_no_note")}
            </span>
            {!neverExpires && isExpired && (
              <Badge className="-p-2" variant="default">
                {t("expired")}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex">
            <span
              className={classNames(
                "flex flex-col space-x-2 space-y-1 text-xs sm:flex-row sm:space-y-0 sm:rtl:space-x-reverse",
                isExpired ? "text-red-600" : "text-gray-500",
                neverExpires ? "text-yellow-600" : ""
              )}>
              {neverExpires ? (
                <div className="flex flex-row space-x-3 text-gray-500">
                  <ExclamationIcon className="w-4" />
                  {t("api_key_never_expires")}
                </div>
              ) : (
                `${isExpired ? t("expired") : t("expires")} ${dayjs(
                  props?.apiKey?.expiresAt?.toString()
                ).fromNow()}`
              )}
            </span>
          </div>
        </div>
        <div className="flex">
          <Tooltip side="top" content={t("edit_api_key")}>
            <Button
              onClick={() => props.onEditApiKey()}
              color="minimal"
              size="icon"
              StartIcon={PencilAltIcon}
              className="ml-4 w-full self-center p-2"
            />
          </Tooltip>
          <Dialog>
            <Tooltip side="top" content={t("delete_api_key")}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  color="minimal"
                  size="icon"
                  StartIcon={TrashIcon}
                  className="ml-2 w-full self-center p-2"
                />
              </DialogTrigger>
            </Tooltip>
            <ConfirmationDialogContent
              variety="danger"
              title={t("confirm_delete_api_key")}
              confirmBtnText={t("revoke_api_key")}
              cancelBtnText={t("cancel")}
              onConfirm={() =>
                deleteApiKey.mutate({
                  id: props.apiKey.id,
                })
              }>
              {t("delete_api_key_confirm_title")}
            </ConfirmationDialogContent>
          </Dialog>
        </div>
      </div>
    </ListItem>
  );
}
