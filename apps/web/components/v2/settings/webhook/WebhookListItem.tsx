import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Dialog, DialogTrigger } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import Badge from "@calcom/ui/v2/core/Badge";
import Button from "@calcom/ui/v2/core/Button";
import Switch from "@calcom/ui/v2/core/Switch";
import { Tooltip } from "@calcom/ui/v2/core/Tooltip";
import { ListItem } from "@calcom/ui/v2/modules/List";

export type TWebhook = inferQueryOutput<"viewer.webhook.list">[number];

export default function WebhookListItem(props: {
  webhook: TWebhook;
  onEditWebhook: () => void;
  lastItem: boolean;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { webhook } = props;
  const deleteWebhook = trpc.useMutation("viewer.webhook.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.webhook.list"]);
    },
  });
  const toggleWebhook = trpc.useMutation("viewer.webhook.edit", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.webhook.list"]);
    },
  });

  return (
    <div className={classNames("flex w-full p-4", props.lastItem ? "" : "border-b")}>
      <div className="flex space-x-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{webhook.subscriberUrl}</p>
          <Tooltip
            content={webhook.eventTriggers.map((trigger) => (
              <p key={trigger}>{t(`${trigger.toLowerCase()}`)}</p>
            ))}>
            <div className="mt-2.5 w-max">
              <Badge variant="gray" bold StartIcon={Icon.FiAlertCircle}>
                {t("triggers_when")}
              </Badge>
            </div>
          </Tooltip>
        </div>
        <div className="flex items-center space-x-4">
          <Switch
            defaultChecked={webhook.active}
            onCheckedChange={() =>
              toggleWebhook.mutate({
                id: webhook.id,
                active: !webhook.active,
                payloadTemplate: webhook.payloadTemplate,
              })
            }
          />
          <Button color="secondary" onClick={props.onEditWebhook}>
            {t("edit")}
          </Button>
          <Button
            color="destructive"
            StartIcon={Icon.FiTrash}
            size="icon"
            onClick={() => deleteWebhook.mutate({ id: webhook.id })}
          />
        </div>
      </div>
    </div>
  );
}
