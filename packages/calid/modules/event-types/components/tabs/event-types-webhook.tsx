"use client";

import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import type { Webhook } from "@prisma/client";
import Link from "next/link";
import React from "react";
import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";

import type { FormValues, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { WebhookForm } from "@calcom/features/webhooks/components";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import { useFieldPermissions, FieldPermissionIndicator } from "./hooks/useFieldPermissions";

// Types from old components
export type TWebhook = RouterOutputs["viewer"]["webhook"]["calid_list"][number];

export type WebhookFormData = {
  id?: string;
  subscriberUrl: string;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  payloadTemplate: string | undefined | null;
  time?: number | null;
  timeUnit?: TimeUnit | null;
};

export type WebhookFormSubmitData = WebhookFormData & {
  changeSecret: boolean;
  newSecret: string;
};

export const EventWebhooks = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const formMethods = useFormContext<FormValues>();

  // Data fetching
  const { data: webhooks, isLoading: webhooksLoading } = trpc.viewer.webhook.calid_list.useQuery({
    eventTypeId: eventType.id,
  });

  const { data: installedApps, isLoading: appsLoading } = trpc.viewer.apps.calid_integrations.useQuery({
    variant: "other",
    onlyInstalled: true,
  });

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook>();

  // Field permissions management
  const fieldPermissions = useFieldPermissions({
    eventType,
    translate: t,
    formMethods,
  });
  const { isChildrenManagedEventType, isManagedEventType } = fieldPermissions;
  const webhookFieldState = fieldPermissions.getFieldState("webhooks");
  const lockedText = webhookFieldState.isLocked ? "locked" : "unlocked";
  const cannotEditWebhooks = isChildrenManagedEventType ? webhookFieldState.isLocked : false;

  // Mutations
  const createWebhookMutation = trpc.viewer.webhook.calid_create.useMutation({
    async onSuccess() {
      setCreateModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      triggerToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      triggerToast(`${error.message}`, "error");
    },
  });

  const editWebhookMutation = trpc.viewer.webhook.calid_edit.useMutation({
    async onSuccess() {
      setEditModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      triggerToast(t("webhook_updated_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      triggerToast(`${error.message}`, "error");
    },
  });

  const deleteWebhookMutation = trpc.viewer.webhook.calid_delete.useMutation({
    async onSuccess() {
      revalidateEventTypeEditPage(eventType.id);
      triggerToast(t("webhook_removed_successfully"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      triggerToast(`${error.message}`, "error");
    },
  });

  const toggleWebhookMutation = trpc.viewer.webhook.calid_edit.useMutation({
    async onSuccess(data) {
      revalidateEventTypeEditPage(eventType.id);
      triggerToast(t(data?.active ? "enabled" : "disabled"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      triggerToast(`${error.message}`, "error");
    },
  });

  // Event handlers
  const onCreateWebhook = useCallback(
    async (values: WebhookFormSubmitData) => {
      if (
        subscriberUrlReserved({
          subscriberUrl: values.subscriberUrl,
          id: values.id,
          webhooks,
          eventTypeId: eventType.id,
        })
      ) {
        triggerToast(t("webhook_subscriber_url_reserved"), "error");
        return;
      }

      if (!values.payloadTemplate) {
        values.payloadTemplate = null;
      }

      createWebhookMutation.mutate({
        subscriberUrl: values.subscriberUrl,
        eventTriggers: values.eventTriggers,
        active: values.active,
        payloadTemplate: values.payloadTemplate,
        secret: values.secret,
        eventTypeId: eventType.id,
        time: values.time,
        timeUnit: values.timeUnit,
      });
    },
    [webhooks, eventType.id, createWebhookMutation, t]
  );

  const onEditWebhook = useCallback(
    (values: WebhookFormSubmitData) => {
      if (
        subscriberUrlReserved({
          subscriberUrl: values.subscriberUrl,
          id: webhookToEdit?.id,
          webhooks,
          eventTypeId: eventType.id,
        })
      ) {
        triggerToast(t("webhook_subscriber_url_reserved"), "error");
        return;
      }

      if (values.changeSecret) {
        values.secret = values.newSecret.length ? values.newSecret : null;
      }

      if (!values.payloadTemplate) {
        values.payloadTemplate = null;
      }

      editWebhookMutation.mutate({
        id: webhookToEdit?.id || "",
        subscriberUrl: values.subscriberUrl,
        eventTriggers: values.eventTriggers,
        active: values.active,
        payloadTemplate: values.payloadTemplate,
        secret: values.secret,
        eventTypeId: webhookToEdit?.eventTypeId || undefined,
        timeUnit: values.timeUnit,
        time: values.time,
      });
    },
    [webhookToEdit, webhooks, eventType.id, editWebhookMutation, t]
  );

  const deleteWebhook = useCallback(
    (webhook: Webhook) => {
      deleteWebhookMutation.mutate({
        id: webhook.id,
        eventTypeId: webhook.eventTypeId || undefined,
        calIdTeamId: webhook.teamId || undefined,
      });
    },
    [deleteWebhookMutation]
  );

  const toggleWebhook = useCallback(
    (webhook: Webhook) => {
      toggleWebhookMutation.mutate({
        id: webhook.id,
        active: !webhook.active,
        payloadTemplate: webhook.payloadTemplate,
        eventTypeId: webhook.eventTypeId || undefined,
      });
    },
    [toggleWebhookMutation]
  );

  const NewWebhookButton = () => {
    return (
      <Button
        color="primary"
        data-testid="new_webhook"
        onClick={() => setCreateModalOpen(true)}
        StartIcon="plus">
        {t("create_webhook")}
      </Button>
    );
  };

  // Loading state
  if (webhooksLoading && !webhooks) {
    return (
      <div className="mx-auto max-w-none space-y-6 p-0">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-none space-y-6 p-0">
      {webhooks && !appsLoading && (
        <>
          <div>
            <div>
              <>
                {/* Locked fields alert */}
                {(isManagedEventType || isChildrenManagedEventType) && (
                  <Alert
                    severity={webhookFieldState.isLocked ? "neutral" : "info"}
                    className="mb-2"
                    title={
                      <ServerTrans
                        t={t}
                        i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admins"}`}
                      />
                    }
                    actions={
                      <div className="flex h-full items-center ">
                        <FieldPermissionIndicator
                          fieldName="webhooks"
                          fieldPermissions={fieldPermissions}
                          t={t}
                        />
                      </div>
                    }
                    message={
                      <ServerTrans
                        t={t}
                        i18nKey={`webhooks_${lockedText}_${
                          isManagedEventType ? "for_members" : "by_team_admins"
                        }_description`}
                      />
                    }
                  />
                )}

                {webhooks.length ? (
                  <>
                    <div className="my-8 space-y-4">
                      {!isChildrenManagedEventType && (
                        <div className="flex justify-end">
                          <NewWebhookButton />
                        </div>
                      )}
                      {webhooks.map((webhook) => {
                        const isReadOnly = isChildrenManagedEventType && webhookFieldState.isLocked;

                        return (
                          <div
                            key={webhook.id}
                            className={`rounded-lg border p-4 transition-colors ${
                              webhook.active ? "border-green-200 bg-green-50" : "bg-primary border-gray-200"
                            }`}
                            style={
                              webhook.active
                                ? {
                                    borderColor: "rgba(0, 140, 68, 0.3)",
                                    backgroundColor: "rgba(0, 140, 68, 0.05)",
                                  }
                                : {}
                            }>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    webhook.active ? "bg-green-100" : "bg-blue-100"
                                  }`}
                                  style={
                                    webhook.active
                                      ? {
                                          backgroundColor: "rgba(0, 140, 68, 0.1)",
                                        }
                                      : {}
                                  }>
                                  <Icon
                                    name="zap"
                                    className={`h-4 w-4 ${
                                      webhook.active ? "text-green-600" : "text-blue-600"
                                    }`}
                                    style={
                                      webhook.active
                                        ? {
                                            color: "#008c44",
                                          }
                                        : {}
                                    }
                                  />
                                </div>
                                <div>
                                  <h4 className="text-default font-medium">{webhook.subscriberUrl}</h4>
                                </div>
                              </div>

                              {!isReadOnly && (
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    defaultChecked={webhook.active}
                                    data-testid="webhook-switch"
                                    onCheckedChange={() => toggleWebhook(webhook)}
                                  />

                                  <Button
                                    color="secondary"
                                    StartIcon="pencil-line"
                                    onClick={() => {
                                      setEditModalOpen(true);
                                      setWebhookToEdit(webhook);
                                    }}
                                    data-testid="webhook-edit-button"
                                  />

                                  <Button
                                    StartIcon="trash-2"
                                    color="secondary"
                                    onClick={() => deleteWebhook(webhook)}
                                  />

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button className="lg:hidden" color="secondary" StartIcon="ellipsis" />
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent side="bottom" align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditModalOpen(true);
                                          setWebhookToEdit(webhook);
                                        }}
                                        StartIcon="pencil">
                                        {t("edit")}
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        onClick={() => deleteWebhook(webhook)}
                                        color="destructive"
                                        StartIcon="trash">
                                        {t("delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {webhook.eventTriggers.slice(0, 3).map((trigger) => (
                                <span
                                  key={trigger}
                                  className="text-default bg-default inline-flex items-center rounded-full px-2 py-1"
                                  style={{ fontSize: "12px" }}>
                                  {t(`${trigger.toLowerCase()}`)}
                                </span>
                              ))}
                              {webhook.eventTriggers.length > 3 && (
                                <Tooltip
                                  content={
                                    <div className="space-y-1">
                                      {webhook.eventTriggers.slice(3).map((trigger) => (
                                        <div key={trigger} className="text-xsm">
                                          {t(`${trigger.toLowerCase()}`)}
                                        </div>
                                      ))}
                                    </div>
                                  }>
                                  <span
                                    className="bg-default text-default cursor-help rounded-full px-2 py-1"
                                    style={{ fontSize: "12px" }}>
                                    +{webhook.eventTriggers.length - 3} more
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <p className="text-default text-sm font-normal">
                        <ServerTrans
                          t={t}
                          i18nKey="edit_or_manage_webhooks"
                          components={[
                            <Link
                              key="edit_or_manage_webhooks"
                              className="cursor-pointer font-semibold underline"
                              href="/settings/developer/webhooks">
                              {t("webhooks_settings")}
                            </Link>,
                          ]}
                        />
                      </p>
                    </div>
                  </>
                ) : (
                  <BlankCard
                    Icon="webhook"
                    headline={t("create_your_first_webhook")}
                    description={t("first_event_type_webhook_description")}
                    buttonRaw={
                      cannotEditWebhooks ? (
                        <Button disabled StartIcon="lock">
                          {t("locked_by_team_admins")}
                        </Button>
                      ) : (
                        <NewWebhookButton />
                      )
                    }
                  />
                )}
              </>
            </div>
          </div>
          {/* New webhook dialog */}
          <Dialog open={createModalOpen} onOpenChange={(isOpen) => !isOpen && setCreateModalOpen(false)}>
            <DialogContent enableOverflow>
              <DialogHeader>
                <DialogTitle>{t("create_webhook")}</DialogTitle>
                <DialogDescription>{t("create_webhook_team_event_type")}</DialogDescription>
              </DialogHeader>
              <WebhookForm
                noRoutingFormTriggers={true}
                onSubmit={onCreateWebhook}
                onCancel={() => setCreateModalOpen(false)}
                apps={installedApps?.items.map((app) => app.slug)}
              />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent size="md" type="creation" title={t("edit_webhook")} enableOverflow>
              <WebhookForm
                noRoutingFormTriggers={true}
                webhook={webhookToEdit}
                apps={installedApps?.items.map((app) => app.slug)}
                onCancel={() => setEditModalOpen(false)}
                onSubmit={onEditWebhook}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
