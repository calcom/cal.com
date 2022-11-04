import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import Switch from "@calcom/ui/v2/core/Switch";
import { Tooltip } from "@calcom/ui/v2/core/Tooltip";
import showToast from "@calcom/ui/v2/core/notifications";

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
      showToast(t("webhook_removed_successfully"), "success");
    },
  });
  const toggleWebhook = trpc.useMutation("viewer.webhook.edit", {
    async onSuccess(data) {
      console.log("data", data);
      await utils.invalidateQueries(["viewer.webhook.list"]);
      // TODO: Better success message
      showToast(t(data?.active ? "enabled" : "disabled"), "success");
    },
  });

  return (
    <div className={classNames("flex w-full justify-between p-4", props.lastItem ? "" : "border-b")}>
      <div>
        <p className="text-sm font-medium text-gray-900">{webhook.subscriberUrl}</p>
        <Tooltip content={t("triggers_when")}>
          <div className="mt-2.5 w-4/5">
            {webhook.eventTriggers.map((trigger) => (
              <Badge key={trigger} className="mr-2" variant="gray" bold StartIcon={Icon.FiAlertCircle}>
                {t(`${trigger.toLowerCase()}`)}
              </Badge>
            ))}
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
          onClick={() => {
            // TODO: Confimation dialog before deleting
            deleteWebhook.mutate({ id: webhook.id });
          }}
        />
      </div>
    </div>
  );
}
