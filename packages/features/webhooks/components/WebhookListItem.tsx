"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { Webhook } from "../lib/dto/types";
import { getWebhookVersionLabel } from "../lib/constants";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Switch } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";
import { revalidateWebhooksList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/(with-loader)/actions";

export default function WebhookListItem(props: {
  webhook: Webhook;
  canEditWebhook?: boolean;
  onEditWebhook: () => void;
  lastItem: boolean;
  permissions: {
    canEditWebhook?: boolean;
    canDeleteWebhook?: boolean;
  };
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { webhook } = props;

  const deleteWebhook = trpc.viewer.webhook.delete.useMutation({
    async onSuccess() {
      if (webhook.eventTypeId) revalidateEventTypeEditPage(webhook.eventTypeId);
      revalidateWebhooksList();
      showToast(t("webhook_removed_successfully"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
  });
  const toggleWebhook = trpc.viewer.webhook.edit.useMutation({
    async onSuccess(data) {
      if (webhook.eventTypeId) revalidateEventTypeEditPage(webhook.eventTypeId);
      revalidateWebhooksList();
      // TODO: Better success message
      showToast(t(data?.active ? "enabled" : "disabled"), "success");
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
          {!props.permissions.canEditWebhook && (
            <Badge variant="gray" className="ml-2 ">
              {t("readonly")}
            </Badge>
          )}
          <Tooltip content={t("webhook_version")}>
            <div className="flex items-center">
              <Badge variant="blue" className="ml-2">
                {getWebhookVersionLabel(webhook.version)}
              </Badge>
            </div>
          </Tooltip>
        </div>
        <Tooltip content={t("triggers_when")}>
          <div className="flex w-4/5 flex-wrap">
            {webhook.eventTriggers.map((trigger) => (
              <Badge
                key={trigger}
                className="mt-2.5 basis-1/5 ltr:mr-2 rtl:ml-2"
                variant="gray"
                startIcon="zap">
                {t(`${trigger.toLowerCase()}`)}
              </Badge>
            ))}
          </div>
        </Tooltip>
      </div>
      {(props.permissions.canEditWebhook || props.permissions.canDeleteWebhook) && (
        <div className="ml-2 flex items-center space-x-4">
          <Switch
            defaultChecked={webhook.active}
            data-testid="webhook-switch"
            disabled={!props.permissions.canEditWebhook}
            onCheckedChange={(checked) =>
              toggleWebhook.mutate({
                id: webhook.id,
                active: checked,
                payloadTemplate: webhook.payloadTemplate,
                eventTypeId: webhook.eventTypeId || undefined,
              })
            }
          />

          {props.permissions.canEditWebhook && (
            <Button
              className="hidden lg:flex"
              color="secondary"
              onClick={props.onEditWebhook}
              data-testid="webhook-edit-button">
              {t("edit")}
            </Button>
          )}

          {props.permissions.canDeleteWebhook && (
            <Button
              className="hidden lg:flex"
              color="destructive"
              StartIcon="trash"
              variant="icon"
              onClick={onDeleteWebhook}
            />
          )}

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button className="lg:hidden" StartIcon="ellipsis" variant="icon" color="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {props.permissions.canEditWebhook && (
                <DropdownMenuItem>
                  <DropdownItem StartIcon="pencil" color="secondary" onClick={props.onEditWebhook}>
                    {t("edit")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {props.permissions.canDeleteWebhook && (
                <DropdownMenuItem>
                  <DropdownItem StartIcon="trash" color="destructive" onClick={onDeleteWebhook}>
                    {t("delete")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </Dropdown>
        </div>
      )}
    </div>
  );
}
