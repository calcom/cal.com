import type { WebhookTriggerEvents } from "@prisma/client";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  showToast,
  Switch,
  Tooltip,
} from "@calcom/ui";
import { AlertCircle, Edit, MoreHorizontal, Trash } from "@calcom/ui/components/icon";

type WebhookProps = {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  eventTypeId: number | null;
};

export default function WebhookListItem(props: {
  webhook: WebhookProps;
  onEditWebhook: () => void;
  lastItem: boolean;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { webhook } = props;
  const deleteWebhook = trpc.viewer.webhook.delete.useMutation({
    async onSuccess() {
      await utils.viewer.webhook.list.invalidate();
      showToast(t("webhook_removed_successfully"), "success");
    },
  });
  const toggleWebhook = trpc.viewer.webhook.edit.useMutation({
    async onSuccess(data) {
      console.log("data", data);
      await utils.viewer.webhook.list.invalidate();
      // TODO: Better success message
      showToast(t(data?.active ? "enabled" : "disabled"), "success");
    },
  });

  const onDeleteWebhook = () => {
    // TODO: Confimation dialog before deleting
    deleteWebhook.mutate({ id: webhook.id, eventTypeId: webhook.eventTypeId || undefined });
  };

  return (
    <div
      className={classNames(
        "flex w-full justify-between p-4",
        props.lastItem ? "" : "border-subtle border-b"
      )}>
      <div className="w-full truncate">
        <p className="text-emphasis truncate text-sm font-medium">{webhook.subscriberUrl}</p>
        <Tooltip content={t("triggers_when")}>
          <div className="flex w-4/5 flex-wrap">
            {webhook.eventTriggers.map((trigger) => (
              <Badge
                key={trigger}
                className="mt-2.5 basis-1/5 ltr:mr-2 rtl:ml-2"
                variant="gray"
                startIcon={AlertCircle}>
                {t(`${trigger.toLowerCase()}`)}
              </Badge>
            ))}
          </div>
        </Tooltip>
      </div>
      <div className="ml-2 flex items-center space-x-4">
        <Switch
          defaultChecked={webhook.active}
          onCheckedChange={() =>
            toggleWebhook.mutate({
              id: webhook.id,
              active: !webhook.active,
              payloadTemplate: webhook.payloadTemplate,
              eventTypeId: webhook.eventTypeId || undefined,
            })
          }
        />
        <Button className="hidden lg:flex" color="secondary" onClick={props.onEditWebhook}>
          {t("edit")}
        </Button>
        <Button
          className="hidden lg:flex"
          color="destructive"
          StartIcon={Trash}
          variant="icon"
          onClick={onDeleteWebhook}
        />
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button className="lg:hidden" StartIcon={MoreHorizontal} variant="icon" color="secondary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <DropdownItem StartIcon={Edit} color="secondary" onClick={props.onEditWebhook}>
                {t("edit")}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <DropdownItem StartIcon={Trash} color="destructive" onClick={onDeleteWebhook}>
                {t("delete")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </div>
  );
}
