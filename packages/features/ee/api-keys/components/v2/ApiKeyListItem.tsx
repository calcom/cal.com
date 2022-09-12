import dayjs from "@calcom/dayjs";
import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Badge from "@calcom/ui/v2/core/Badge";
import Button from "@calcom/ui/v2/core/Button";
import Dropdown, {
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
          <p className="text-gray-600">
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
            <Button size="icon" StartIcon={Icon.FiMoreHorizontal} color="secondary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className="flex items-center space-x-2.5 py-3 pr-32 pl-3.5"
              onClick={onEditClick}>
              <Icon.FiEdit2 />
              <p>{t("edit")}</p>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center space-x-2.5 py-3 pr-32 pl-3.5"
              onClick={() =>
                deleteApiKey.mutate({
                  id: apiKey.id,
                })
              }>
              <Icon.FiTrash2 />
              <p>{t("delete")}</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </div>
  );
};

export default ApiKeyListItem;
