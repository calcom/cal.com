import { PencilAltIcon, TrashIcon } from "@heroicons/react/outline";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogTrigger } from "@calcom/ui/Dialog";

import { inferQueryOutput, trpc } from "@lib/trpc";

import { ListItem } from "@components/List";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Badge from "@components/ui/Badge";

export type TApiKeys = inferQueryOutput<"viewer.apiKeys.list">[number];

export default function ApiKeyListItem(props: { apiKey: TApiKeys; onEditApiKey: () => void }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const isExpired = props.apiKey.expiresAt < new Date();
  const deleteApiKey = trpc.useMutation("viewer.apiKeys.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.apiKeys.list"]);
    },
  });
  return (
    <ListItem className="-mt-px flex w-full p-4">
      <div className="flex w-full justify-between">
        <div className="flex max-w-full flex-col truncate">
          <div className="flex space-x-2">
            <span className={classNames("truncate text-sm", isExpired ? "text-gray-500" : "text-gray-900")}>
              {props?.apiKey?.note}
            </span>
            {isExpired ? <Badge variant="default">Expired</Badge> : null}
          </div>
          <div className="mt-2 flex">
            <span
              className={classNames(
                "flex flex-col space-x-2 space-y-1 text-xs sm:flex-row sm:space-y-0 sm:rtl:space-x-reverse",
                isExpired ? "text-red-500" : "text-gray-900"
              )}>
              {props?.apiKey?.expiresAt.toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex">
          <Tooltip content={t("edit_api_key")}>
            <Button
              onClick={() => props.onEditApiKey()}
              color="minimal"
              size="icon"
              StartIcon={PencilAltIcon}
              className="ml-4 w-full self-center p-2"></Button>
          </Tooltip>
          <Dialog>
            <Tooltip content={t("delete_api_key")}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  color="minimal"
                  size="icon"
                  StartIcon={TrashIcon}
                  className="ml-2 w-full self-center p-2"></Button>
              </DialogTrigger>
            </Tooltip>
            <ConfirmationDialogContent
              variety="danger"
              title={t("delete_api-key")}
              confirmBtnText={t("confirm_delete_api_key")}
              cancelBtnText={t("cancel")}
              onConfirm={() =>
                deleteApiKey.mutate({
                  id: props.apiKey.id,
                })
              }>
              {t("delete_api_key_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        </div>
      </div>
    </ListItem>
  );
}
