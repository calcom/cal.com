"use client";

import {
  Icon,
  Switch,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogContent,
} from "@calid/features/ui";
import type { Webhook } from "@prisma/client";
import type { TFunction } from "i18next";
import { default as get } from "lodash/get";
import Link from "next/link";
import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";

import type { FormValues, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { WebhookForm } from "@calcom/features/webhooks/components";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import type { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

// Types from old components
export type TWebhook = RouterOutputs["viewer"]["webhook"]["list"][number];

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

type WebhookTriggerEventOptions = readonly { value: WebhookTriggerEvents; label: string }[];

// Locked fields management
const useLockedFieldsManager = ({
  eventType,
  translate,
  formMethods,
}: {
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">;
  translate: TFunction;
  formMethods: UseFormReturn<FormValues>;
}) => {
  const { setValue, getValues } = formMethods;
  const [fieldStates, setFieldStates] = useState<Record<string, boolean>>({});
  const unlockedFields =
    (eventType.metadata?.managedEventConfig?.unlockedFields !== undefined &&
      eventType.metadata?.managedEventConfig?.unlockedFields) ||
    {};

  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const isChildrenManagedEventType =
    eventType.metadata?.managedEventConfig !== undefined &&
    eventType.schedulingType !== SchedulingType.MANAGED;

  const setUnlockedFields = (fieldName: string, val: boolean | undefined) => {
    const path = "metadata.managedEventConfig.unlockedFields";
    const metaUnlockedFields = getValues(path);
    if (!metaUnlockedFields) return;
    if (val === undefined) {
      delete metaUnlockedFields[fieldName as keyof typeof metaUnlockedFields];
      setValue(path, { ...metaUnlockedFields }, { shouldDirty: true });
    } else {
      setValue(
        path,
        {
          ...metaUnlockedFields,
          [fieldName]: val,
        },
        { shouldDirty: true }
      );
    }
  };

  const getLockedInitState = (fieldName: string): boolean => {
    let locked = isManagedEventType || isChildrenManagedEventType;

    if (fieldName.includes(".")) {
      locked = locked && get(unlockedFields, fieldName) === undefined;
    } else {
      type FieldName = string;
      const unlockedFieldList = getValues("metadata")?.managedEventConfig?.unlockedFields as
        | Record<FieldName, boolean>
        | undefined;
      const fieldIsUnlocked = !!unlockedFieldList?.[fieldName];
      locked = locked && !fieldIsUnlocked;
    }
    return locked;
  };

  const shouldLockDisableProps = (fieldName: string, options?: { simple: true }) => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates({
        ...fieldStates,
        [fieldName]: getLockedInitState(fieldName),
      });
    }

    const isLocked = fieldStates[fieldName];
    const stateText = translate(isLocked ? "locked" : "unlocked");
    const tooltipText = translate(
      `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
    );

    const LockedIcon = (isManagedEventType || isChildrenManagedEventType) && (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline">
            <Badge
              variant={isLocked ? "gray" : "green"}
              className={classNames(
                "ml-2 transform justify-between p-1",
                isManagedEventType && !options?.simple && "w-28"
              )}>
              {!options?.simple && (
                <span className="inline-flex">
                  <Icon name={isLocked ? "lock" : "lock-open"} className="text-subtle h-3 w-3" />
                  <span className="ml-1 font-medium">{stateText}</span>
                </span>
              )}
              {isManagedEventType && (
                <Switch
                  data-testid={`locked-indicator-${fieldName}`}
                  onCheckedChange={(enabled) => {
                    setFieldStates({
                      ...fieldStates,
                      [fieldName]: enabled,
                    });
                    setUnlockedFields(fieldName, !enabled || undefined);
                  }}
                  checked={isLocked}
                  size="sm"
                />
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );

    return {
      disabled:
        !isManagedEventType &&
        eventType.metadata?.managedEventConfig !== undefined &&
        unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined,
      LockedIcon,
      isLocked: fieldStates[fieldName],
    };
  };

  return {
    shouldLockDisableProps,
    isManagedEventType,
    isChildrenManagedEventType,
  };
};

// // Webhook form component
// const WebhookForm = (props: {
//   webhook?: WebhookFormData;
//   apps?: (keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)[];
//   overrideTriggerOptions?: (typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)["core"];
//   onSubmit: (event: WebhookFormSubmitData) => void;
//   onCancel?: () => void;
//   noRoutingFormTriggers: boolean;
//   selectOnlyInstantMeetingOption?: boolean;
// }) => {
//   const { apps = [], selectOnlyInstantMeetingOption = false, overrideTriggerOptions } = props;
//   const { t } = useLocale();

//   const triggerOptions = overrideTriggerOptions
//     ? [...overrideTriggerOptions]
//     : [...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2["core"]];

//   if (apps) {
//     for (const app of apps) {
//       if (app === "routing-forms" && props.noRoutingFormTriggers) continue;
//       if (WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]) {
//         triggerOptions.push(...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]);
//       }
//     }
//   }

//   const translatedTriggerOptions = triggerOptions.map((option) => ({ ...option, label: t(option.label) }));

//   const getEventTriggers = () => {
//     if (props.webhook) return props.webhook.eventTriggers;

//     return (
//       selectOnlyInstantMeetingOption
//         ? translatedTriggerOptions.filter((option) => option.value === WebhookTriggerEvents.INSTANT_MEETING)
//         : translatedTriggerOptions.filter((option) => option.value !== WebhookTriggerEvents.INSTANT_MEETING)
//     ).map((option) => option.value);
//   };

//   const formMethods = useForm<WebhookFormData>({
//     defaultValues: {
//       subscriberUrl: props.webhook?.subscriberUrl || "",
//       active: props.webhook ? props.webhook.active : true,
//       eventTriggers: getEventTriggers(),
//       secret: props?.webhook?.secret || "",
//       payloadTemplate: props?.webhook?.payloadTemplate || undefined,
//       timeUnit: props?.webhook?.timeUnit || undefined,
//       time: props?.webhook?.time || undefined,
//     },
//   });

//   const showTimeSection = formMethods
//     .watch("eventTriggers")
//     ?.find(
//       (trigger) =>
//         trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
//         trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
//     );

//   const [useCustomTemplate, setUseCustomTemplate] = useState(
//     props?.webhook?.payloadTemplate !== undefined && props?.webhook?.payloadTemplate !== null
//   );
//   const [newSecret, setNewSecret] = useState("");
//   const [changeSecret, setChangeSecret] = useState<boolean>(false);
//   const hasSecretKey = !!props?.webhook?.secret;

//   useEffect(() => {
//     if (changeSecret) {
//       formMethods.unregister("secret", { keepDefaultValue: false });
//     }
//   }, [changeSecret, formMethods]);

//   return (
//     <Form {...formMethods}>
//       <form
//         onSubmit={formMethods.handleSubmit((values) =>
//           props.onSubmit({ ...values, changeSecret, newSecret })
//         )}>
//         <div className="border-subtle space-y-6 border p-6">
//           <FormField
//             control={formMethods.control}
//             name="subscriberUrl"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel className="text-emphasis text-sm font-medium">{t("subscriber_url")}</FormLabel>
//                 <FormControl>
//                   <TextField
//                     {...field}
//                     required
//                     type="url"
//                     onChange={(e) => {
//                       field.onChange(e.target.value);
//                       if (hasTemplateIntegration({ url: e.target.value })) {
//                         setUseCustomTemplate(true);
//                         formMethods.setValue("payloadTemplate", customTemplate({ url: e.target.value }), {
//                           shouldDirty: true,
//                         });
//                       }
//                     }}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={formMethods.control}
//             name="active"
//             render={({ field }) => (
//               <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
//                 <div className="space-y-0.5">
//                   <FormLabel className="text-base font-medium">{t("enable_webhook")}</FormLabel>
//                 </div>
//                 <FormControl>
//                   <Switch checked={field.value} onCheckedChange={field.onChange} />
//                 </FormControl>
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={formMethods.control}
//             name="eventTriggers"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel className="text-emphasis text-sm font-medium">{t("event_triggers")}</FormLabel>
//                 <FormControl>
//                   <Select
//                     value={field.value?.join(",")}
//                     onValueChange={(value) => {
//                       const triggers = value ? (value.split(",") as WebhookTriggerEvents[]) : [];
//                       field.onChange(triggers);

//                       const noShowWebhookTriggerExists = !!triggers.find(
//                         (trigger) =>
//                           trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
//                           trigger === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
//                       );

//                       if (noShowWebhookTriggerExists) {
//                         formMethods.setValue("time", props.webhook?.time ?? 5, { shouldDirty: true });
//                         formMethods.setValue("timeUnit", props.webhook?.timeUnit ?? TimeUnit.MINUTE, {
//                           shouldDirty: true,
//                         });
//                       } else {
//                         formMethods.setValue("time", undefined, { shouldDirty: true });
//                         formMethods.setValue("timeUnit", undefined, { shouldDirty: true });
//                       }
//                     }}>
//                     <SelectTrigger>
//                       <SelectValue placeholder={t("select_triggers")} />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {translatedTriggerOptions.map((option) => (
//                         <SelectItem key={option.value} value={option.value}>
//                           {option.label}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {showTimeSection && (
//             <div className="space-y-2">
//               <Label>{t("how_long_after_user_no_show_minutes")}</Label>
//               <TimeTimeUnitInput disabled={false} defaultTime={5} />
//             </div>
//           )}

//           <div className="space-y-4">
//             {!!hasSecretKey && !changeSecret && (
//               <>
//                 <Label className="text-emphasis text-sm font-medium">Secret</Label>
//                 <div className="bg-default space-y-0 rounded-md border-0 border-neutral-200 sm:mx-0 md:border">
//                   <div className="text-emphasis rounded-sm border-b p-2 text-sm">
//                     {t("forgotten_secret_description")}
//                   </div>
//                   <div className="p-2">
//                     <Button color="secondary" type="button" onClick={() => setChangeSecret(true)}>
//                       {t("change_secret")}
//                     </Button>
//                   </div>
//                 </div>
//               </>
//             )}
//             {!!hasSecretKey && changeSecret && (
//               <>
//                 <div className="space-y-2">
//                   <Label className="text-emphasis text-sm font-medium">{t("secret")}</Label>
//                   <TextField
//                     autoComplete="off"
//                     value={newSecret}
//                     onChange={(event) => setNewSecret(event.currentTarget.value)}
//                     type="text"
//                     placeholder={t("leave_blank_to_remove_secret")}
//                   />
//                 </div>
//                 <Button color="secondary" type="button" size="sm" onClick={() => setChangeSecret(false)}>
//                   {t("cancel")}
//                 </Button>
//               </>
//             )}
//             {!hasSecretKey && (
//               <FormField
//                 control={formMethods.control}
//                 name="secret"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-emphasis text-sm font-medium">{t("secret")}</FormLabel>
//                     <FormControl>
//                       <TextField {...field} value={field.value || ""} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             )}
//           </div>

//           <div className="space-y-4">
//             <Label className="text-emphasis text-sm font-medium">{t("payload_template")}</Label>
//             <ToggleGroup
//               value={useCustomTemplate ? "custom" : "default"}
//               onValueChange={(val) => {
//                 if (val === "default") {
//                   setUseCustomTemplate(false);
//                   formMethods.setValue("payloadTemplate", undefined, { shouldDirty: true });
//                 } else {
//                   setUseCustomTemplate(true);
//                 }
//               }}
//               type="single"
//               className="grid w-full grid-cols-2">
//               <ToggleGroupItem value="default" className="text-center">
//                 {t("default")}
//               </ToggleGroupItem>
//               <ToggleGroupItem value="custom" className="text-center">
//                 {t("custom")}
//               </ToggleGroupItem>
//             </ToggleGroup>
//             {useCustomTemplate && (
//               <FormField
//                 control={formMethods.control}
//                 name="payloadTemplate"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormControl>
//                       <Textarea {...field} rows={3} value={field.value || ""} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             )}
//           </div>
//         </div>

//         <SectionBottomActions align="end">
//           <Button type="button" variant="outline" onClick={props.onCancel}>
//             {t("cancel")}
//           </Button>
//           <Button
//             type="submit"
//             data-testid="create_webhook"
//             disabled={!formMethods.formState.isDirty && !changeSecret}
//             loading={formMethods.formState.isSubmitting}>
//             {props?.webhook?.id ? t("save") : t("create_webhook")}
//           </Button>
//         </SectionBottomActions>

//         <div className="mb-4 mt-6 rounded-md">
//           <WebhookTestDisclosure />
//         </div>
//       </form>
//     </Form>
//   );
// };

export const EventWebhooks = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const formMethods = useFormContext<FormValues>();

  // Data fetching
  const { data: webhooks, isLoading: webhooksLoading } = trpc.viewer.webhook.list.useQuery({
    eventTypeId: eventType.id,
  });

  const { data: installedApps, isLoading: appsLoading } = trpc.viewer.apps.integrations.useQuery({
    variant: "other",
    onlyInstalled: true,
  });

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook>();

  // Locked fields management
  const { shouldLockDisableProps, isChildrenManagedEventType, isManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const webhooksDisableProps = shouldLockDisableProps("webhooks", { simple: true });
  const lockedText = webhooksDisableProps.isLocked ? "locked" : "unlocked";
  const cannotEditWebhooks = isChildrenManagedEventType ? webhooksDisableProps.isLocked : false;

  // Mutations
  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      setCreateModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess() {
      setEditModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      showToast(t("webhook_updated_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const deleteWebhookMutation = trpc.viewer.webhook.delete.useMutation({
    async onSuccess() {
      revalidateEventTypeEditPage(eventType.id);
      showToast(t("webhook_removed_successfully"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const toggleWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess(data) {
      revalidateEventTypeEditPage(eventType.id);
      showToast(t(data?.active ? "enabled" : "disabled"), "success");
      await utils.viewer.webhook.getByViewer.invalidate();
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
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
        showToast(t("webhook_subscriber_url_reserved"), "error");
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
        showToast(t("webhook_subscriber_url_reserved"), "error");
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
        teamId: webhook.teamId || undefined,
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
      <Button color="primary" data-testid="new_webhook" onClick={() => setCreateModalOpen(true)}>
        <Icon name="plus" className="mr-2 h-4 w-4" />
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
                  <Alert variant={webhooksDisableProps.isLocked ? "neutral" : "info"} className="mb-2">
                    <AlertTitle>
                      <ServerTrans
                        t={t}
                        i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admins"}`}
                      />
                    </AlertTitle>

                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <ServerTrans
                          t={t}
                          i18nKey={`webhooks_${lockedText}_${
                            isManagedEventType ? "for_members" : "by_team_admins"
                          }_description`}
                        />
                        <div className="ml-2 flex h-full items-center">{webhooksDisableProps.LockedIcon}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {webhooks.length ? (
                  <>
                    <div className="border-subtle mb-2 rounded-md border p-8">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-default text-sm font-semibold">{t("webhooks")}</div>
                          <p className="text-subtle max-w-[280px] break-words text-sm sm:max-w-[500px]">
                            {t("add_webhook_description", { appName: APP_NAME })}
                          </p>
                        </div>
                        {cannotEditWebhooks ? (
                          <Button disabled>
                            <Icon name="lock" className="mr-2 h-4 w-4" />
                            {t("locked_by_team_admin")}
                          </Button>
                        ) : (
                          <NewWebhookButton />
                        )}
                      </div>

                      <div className="my-8 space-y-4">
                        {webhooks.map((webhook) => {
                          const isReadOnly =
                            isChildrenManagedEventType && webhook.eventTypeId !== eventType.id;

                          return (
                            <div
                              key={webhook.id}
                              className={`rounded-lg border p-4 transition-colors ${
                                webhook.active ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
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
                                    <h4
                                      className="font-medium"
                                      style={{ fontSize: "14px", color: "#384252" }}>
                                      {webhook.subscriberUrl}
                                    </h4>
                                    {isReadOnly && (
                                      <Badge variant="gray" className="mt-1">
                                        {t("readonly")}
                                      </Badge>
                                    )}
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
                                      className="hidden rounded p-1 text-sm font-medium text-blue-600 transition-colors hover:bg-gray-200 lg:flex"
                                      color="minimal"
                                      size="sm"
                                      onClick={() => {
                                        setEditModalOpen(true);
                                        setWebhookToEdit(webhook);
                                      }}
                                      data-testid="webhook-edit-button">
                                      <Icon name="pencil" className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      className="hidden rounded p-1 text-red-500 transition-colors hover:bg-gray-200 hover:text-red-700 lg:flex"
                                      color="minimal"
                                      size="sm"
                                      onClick={() => deleteWebhook(webhook)}>
                                      <Icon name="trash" className="h-4 w-4" />
                                    </Button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button className="lg:hidden" color="secondary">
                                          <Icon name="ellipsis" className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>

                                      <DropdownMenuContent>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setEditModalOpen(true);
                                            setWebhookToEdit(webhook);
                                          }}>
                                          <span className="bg-default inline-flex items-center">
                                            <Icon name="pencil" className="mr-2 h-4 w-4" />
                                            {t("edit")}
                                          </span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem onClick={() => deleteWebhook(webhook)}>
                                          <span className="text-destructive inline-flex items-center">
                                            <Icon name="trash" className="mr-2 h-4 w-4" />
                                            {t("delete")}
                                          </span>
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
                                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-gray-700"
                                    style={{ fontSize: "12px" }}>
                                    {/* <Icon name="zap" className="mr-1 h-3 w-3" /> */}
                                    {t(`${trigger.toLowerCase()}`)}
                                  </span>
                                ))}
                                {webhook.eventTriggers.length > 3 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className="cursor-help rounded-full bg-gray-100 px-2 py-1 text-gray-700"
                                        style={{ fontSize: "12px" }}>
                                        +{webhook.eventTriggers.length - 3} more
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        {webhook.eventTriggers.slice(3).map((trigger) => (
                                          <div key={trigger} className="text-sm">
                                            {t(`${trigger.toLowerCase()}`)}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-default text-sm font-normal">
                        <ServerTrans
                          t={t}
                          i18nKey="edit_or_manage_webhooks"
                          components={[
                            <Link
                              key="edit_or_manage_webhooks"
                              className="cursor-pointer font-semibold underline"
                              href="/settings/developer/webhooks">
                              webhooks settings
                            </Link>,
                          ]}
                        />
                      </p>
                    </div>
                  </>
                ) : (
                  <EmptyScreen
                    Icon="webhook"
                    headline={t("create_your_first_webhook")}
                    description={t("first_event_type_webhook_description")}
                    buttonRaw={
                      cannotEditWebhooks ? (
                        <Button disabled>
                          <Icon name="lock" className="mr-2 h-4 w-4" />
                          {t("locked_by_team_admin")}
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
            <DialogContent
              size="sm"
              type="creation"
              title={t("create_webhook")}
              description={t("create_webhook_team_event_type")}
              className="h-[50vh]"
              enableOverflow={true} // This enables scrolling for the content area
            >
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
            <DialogContent size="sm" type="creation" title={t("edit_webhook")} enableOverflow>
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
