"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Switch } from "@calid/features/ui/components/switch";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";

type WebhookProps = {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  eventTypeId: number | null;
  teamId: number | null;
};

export default function WebhookListItem(props: {
  webhook: WebhookProps;
  canEditWebhook?: boolean;
  onEditWebhook: () => void;
  lastItem: boolean;
  readOnly?: boolean;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { webhook } = props;
  const canEditWebhook = props.canEditWebhook ?? true;

  const deleteWebhook = trpc.viewer.webhook.calid_delete.useMutation({
    async onSuccess() {
      if (webhook.eventTypeId) revalidateEventTypeEditPage(webhook.eventTypeId);
      revalidateWebhooksList();
      triggerToast(t("webhook_removed_successfully"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
  });
  const toggleWebhook = trpc.viewer.webhook.calid_edit.useMutation({
    async onSuccess(data) {
      if (webhook.eventTypeId) revalidateEventTypeEditPage(webhook.eventTypeId);
      revalidateWebhooksList();
      // TODO: Better success message
      triggerToast(t(data?.active ? "enabled" : "disabled"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
  });

  const onDeleteWebhook = () => {
    // TODO: Confimation dialog before deleting
    deleteWebhook.mutate({
      id: webhook.id,
      eventTypeId: webhook.eventTypeId || undefined,
      teamId: webhook.teamId || undefined,
    });
  };

  return (
    <div
      className={classNames(
        "flex w-full justify-between p-4",
        props.lastItem ? "" : "border-subtle border-b"
      )}>
      <div className="w-full truncate">
        <div className="flex">
          <Tooltip content={webhook.subscriberUrl}>
            <p className="text-emphasis max-w-[600px] truncate text-sm font-medium">
              {webhook.subscriberUrl}
            </p>
          </Tooltip>
          {!!props.readOnly && (
            <Badge variant="minimal" className="ml-2 ">
              {t("readonly")}
            </Badge>
          )}
        </div>
        <Tooltip content={t("triggers_when")}>
          <div className="flex w-4/5 flex-wrap">
            {webhook.eventTriggers.map((trigger) => (
              <Badge
                key={trigger}
                className="mt-2.5 basis-1/5 ltr:mr-2 rtl:ml-2"
                variant="minimal"
                startIcon="zap">
                {t(`${trigger.toLowerCase()}`)}
              </Badge>
            ))}
          </div>
        </Tooltip>
      </div>
      {!props.readOnly && (
        <div className="ml-2 flex items-center space-x-4">
          <Switch
            defaultChecked={webhook.active}
            data-testid="webhook-switch"
            disabled={!canEditWebhook}
            onCheckedChange={() =>
              toggleWebhook.mutate({
                id: webhook.id,
                active: !webhook.active,
                payloadTemplate: webhook.payloadTemplate,
                eventTypeId: webhook.eventTypeId || undefined,
              })
            }
          />

          <Button
            className="hidden lg:flex"
            color="secondary"
            onClick={props.onEditWebhook}
            data-testid="webhook-edit-button">
            {t("edit")}
          </Button>

          <Button
            className="hidden lg:flex"
            color="destructive"
            StartIcon="trash"
            variant="icon"
            onClick={onDeleteWebhook}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="lg:hidden" StartIcon="ellipsis" variant="icon" color="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={props.onEditWebhook}>{t("edit")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDeleteWebhook}>{t("delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
