import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { triggerToast } from "@calid/features/ui/components/toast";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { revalidateApiKeysList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";

export type TApiKeys = RouterOutputs["viewer"]["apiKeys"]["list"][number];

const ApiKeyListItem = ({
  apiKey,
  lastItem,
  onEditClick,
}: {
  apiKey: TApiKeys;
  lastItem: boolean;
  onEditClick: () => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const isExpired = apiKey?.expiresAt ? apiKey.expiresAt < new Date() : null;
  const neverExpires = apiKey?.expiresAt === null;

  const deleteApiKey = trpc.viewer.apiKeys.delete.useMutation({
    async onSuccess() {
      await utils.viewer.apiKeys.list.invalidate();
      revalidateApiKeysList();
      triggerToast(t("api_key_deleted"), "success");
    },
    onError(err) {
      console.log(err);
      triggerToast(t("something_went_wrong"), "error");
    },
  });

  return (
    <div
      className={`hover:bg-muted flex w-full items-center justify-between px-6 py-4 ${
        !lastItem ? "border-subtle border-b" : ""
      }`}>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-emphasis text-sm font-medium">
            {apiKey?.note ? apiKey.note : t("api_key_no_note")}
          </span>
          {!neverExpires && isExpired && (
            <Badge variant="red" className="text-xs">
              {t("expired")}
            </Badge>
          )}
          {!isExpired && (
            <Badge variant="green" className="text-xs">
              {t("active")}
            </Badge>
          )}
        </div>
        <div className="text-default text-sm">
          {neverExpires ? (
            <span>{t("api_key_never_expires")}</span>
          ) : (
            <span>
              {isExpired ? t("expired") : t("expires")} {dayjs(apiKey?.expiresAt?.toString()).fromNow()}
            </span>
          )}
        </div>
      </div>

      <div className="ml-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem type="button" onClick={onEditClick} StartIcon="pencil">
              {t("edit")}
            </DropdownMenuItem>

            <DropdownMenuItem
              type="button"
              color="destructive"
              disabled={deleteApiKey.isPending}
              onClick={() =>
                deleteApiKey.mutate({
                  id: apiKey.id,
                })
              }
              StartIcon="trash">
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ApiKeyListItem;
