import dayjs from "@calcom/dayjs";
import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import Dropdown, {
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";

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
  const utils = trpc.useContext();

  const isExpired = apiKey?.expiresAt ? apiKey.expiresAt < new Date() : null;
  const neverExpires = apiKey?.expiresAt === null;

  const deleteApiKey = trpc.useMutation("viewer.apiKeys.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.apiKeys.list"]);
    },
  });

  return (
    <div
      key={apiKey.id}
      className={classNames("flex w-full justify-between p-4", lastItem ? "" : "border-b")}>
      <div>
        <p className="font-medium"> {apiKey?.note ? apiKey.note : t("api_key_no_note")}</p>
        <div className="flex items-center space-x-3.5">
          {!neverExpires && isExpired && (
            <Badge className="-p-2" variant="red">
              {t("expired")}
            </Badge>
          )}
          {!isExpired && (
            <Badge className="-p-2" variant="green">
              {t("active")}
            </Badge>
          )}
          <p className="text-xs text-gray-600">
            {" "}
            {neverExpires ? (
              <div className="flex flex-row space-x-3 text-gray-500">{t("api_key_never_expires")}</div>
            ) : (
              `${isExpired ? t("expired") : t("expires")} ${dayjs(apiKey?.expiresAt?.toString()).fromNow()}`
            )}
          </p>
        </div>
      </div>
      <div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" color="secondary" StartIcon={Icon.FiMoreHorizontal} />
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem>
              <DropdownItem type="button" onClick={onEditClick} StartIcon={Icon.FiEdit2}>
                {t("edit") as string}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DropdownItem
                type="button"
                onClick={() =>
                  deleteApiKey.mutate({
                    id: apiKey.id,
                  })
                }
                StartIcon={Icon.FiTrash}>
                {t("delete") as string}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </div>
  );
};

export default ApiKeyListItem;
