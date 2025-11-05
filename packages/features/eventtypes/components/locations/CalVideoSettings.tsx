import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { CalVideoSettings as CalVideoSettingsType } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { UpgradeTeamsBadge } from "@calcom/ui/components/badge";
import { TextField } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import LocationSettingsContainer from "./LocationSettingsContainer";

const CalVideoSettings = ({
  calVideoSettings,
  eventTypeId,
}: {
  calVideoSettings?: CalVideoSettingsType;
  eventTypeId?: number;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();
  const [isExpanded, setIsExpanded] = useState(false);
  const [parent] = useAutoAnimate<HTMLDivElement>();

  const { data: webhookData, isLoading: isLoadingWebhooks } = trpc.viewer.webhook.getByViewer.useQuery();
  const { data: eventTypeSpecificWebhooks, isLoading: isLoadingEventTypeWebhooks } =
    trpc.viewer.webhook.list.useQuery({ eventTypeId: eventTypeId ?? undefined }, { enabled: !!eventTypeId });
  const { data: eventTypeData, isLoading: isLoadingEventType } = trpc.viewer.eventTypes.get.useQuery(
    { id: eventTypeId ?? 0 },
    { enabled: !!eventTypeId }
  );

  // Extract webhooks with their group context (personal, team, org)
  // We need the group context to identify team-level webhooks
  const webhooksWithGroup =
    webhookData?.webhookGroups.flatMap((group) =>
      group.webhooks.map((webhook) => ({ webhook, groupTeamId: group.teamId }))
    ) || [];

  // Add event-type-specific webhooks to the list
  // These are webhooks configured specifically for this event type
  const eventTypeWebhooksWithGroup =
    eventTypeSpecificWebhooks?.map((webhook) => ({
      webhook,
      groupTeamId: null, // Event-type-specific webhooks don't belong to a group
    })) || [];

  // Combine all webhooks and remove duplicates (in case same webhook appears in both queries)
  const webhookIds = new Set<string>();
  const allWebhooksWithGroup = [...webhooksWithGroup, ...eventTypeWebhooksWithGroup].filter(({ webhook }) => {
    if (webhookIds.has(webhook.id)) {
      return false;
    }
    webhookIds.add(webhook.id);
    return true;
  });

  // Filter webhooks to only those relevant to this event type:
  // 1. Event-type-specific webhooks (webhook.eventTypeId === eventTypeId)
  // 2. Team-level webhooks (groupTeamId === eventType.team.id)
  // 3. Org-level webhooks (groupTeamId === eventType.team?.parentId)
  const eventTypeTeamId = eventTypeData?.team?.id;
  const eventTypeOrgId = eventTypeData?.team?.parentId;

  // Check for managed event type (parent event type)
  // Note: parentId might be on eventType directly, but we'll check it when filtering

  // Only filter webhooks if we have eventTypeId and data is loaded
  const relevantWebhooks =
    eventTypeId && !isLoadingEventType && !isLoadingWebhooks && !isLoadingEventTypeWebhooks
      ? allWebhooksWithGroup
          .filter(({ webhook, groupTeamId }) => {
            // Only consider active webhooks
            if (!webhook.active) {
              return false;
            }

            // Event-type-specific webhook (for this event type)
            if (webhook.eventTypeId && webhook.eventTypeId === eventTypeId) {
              return true;
            }

            // Team-level or org-level webhook
            // For team webhooks, use groupTeamId (from group context) as the primary source
            // because webhook.teamId might not be set when webhooks are fetched from team.webhooks
            const webhookTeamId = groupTeamId ?? webhook.teamId;
            if (webhookTeamId && (webhookTeamId === eventTypeTeamId || webhookTeamId === eventTypeOrgId)) {
              return true;
            }

            // User-level webhook (personal webhook)
            // Applies to all event types for the user if:
            // - The webhook has no eventTypeId (not event-type-specific)
            // - The webhook has no teamId (not team-level)
            // - The event type has no teamId (personal event type)
            // - groupTeamId is null (personal webhook group)
            if (
              !webhook.eventTypeId &&
              !webhook.teamId &&
              !groupTeamId &&
              !eventTypeTeamId &&
              !eventTypeOrgId
            ) {
              return true;
            }

            return false;
          })
          .map(({ webhook }) => webhook)
      : [];

  const hasHostNoShowWebhook = relevantWebhooks.some((webhook) =>
    webhook.eventTriggers?.includes(WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW)
  );

  const hasGuestNoShowWebhook = relevantWebhooks.some((webhook) =>
    webhook.eventTriggers?.includes(WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW)
  );

  return (
    <>
      <Tooltip content="expandable" side="right" className="lg:hidden">
        <button
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className={classNames(
            "todesktop:py-[7px] text-default group flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
            "[&[aria-current='page']]:!bg-transparent",
            "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm"
          )}>
          <span className="hidden w-full justify-between truncate text-ellipsis lg:flex">
            {!isExpanded ? t("show_advanced_settings") : t("hide_advanced_settings")}
          </span>
          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="ml-auto h-4 w-4" />
        </button>
      </Tooltip>
      <div ref={parent}>
        {isExpanded && (
          <LocationSettingsContainer>
            <Controller
              name="calVideoSettings.disableRecordingForGuests"
              defaultValue={!!calVideoSettings?.disableRecordingForGuests}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("disable_recording_for_guests")}
                    labelClassName="text-sm leading-6 whitespace-normal break-words"
                    checked={value}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            <Controller
              name="calVideoSettings.disableRecordingForOrganizer"
              defaultValue={!!calVideoSettings?.disableRecordingForOrganizer}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("disable_recording_for_organizer")}
                    labelClassName="text-sm leading-6 whitespace-normal break-words"
                    checked={value}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            {!isPlatform && (
              <Controller
                name="calVideoSettings.enableAutomaticRecordingForOrganizer"
                defaultValue={!!calVideoSettings?.enableAutomaticRecordingForOrganizer}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("enable_automatic_recording")}
                      labelClassName="text-sm"
                      checked={value}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            {!isPlatform && !hasHostNoShowWebhook && (
              <Controller
                name="calVideoSettings.enableAutomaticNoShowTrackingForHosts"
                defaultValue={!!calVideoSettings?.enableAutomaticNoShowTrackingForHosts}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("enable_automatic_no_show_tracking_for_hosts")}
                      labelClassName="text-sm"
                      checked={value}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            {!isPlatform && !hasGuestNoShowWebhook && (
              <Controller
                name="calVideoSettings.enableAutomaticNoShowTrackingForGuests"
                defaultValue={!!calVideoSettings?.enableAutomaticNoShowTrackingForGuests}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("enable_automatic_no_show_tracking_for_guests")}
                      labelClassName="text-sm"
                      checked={value}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            <Controller
              name="calVideoSettings.enableAutomaticTranscription"
              defaultValue={!!calVideoSettings?.enableAutomaticTranscription}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("enable_automatic_transcription")}
                    labelClassName="text-sm leading-6 whitespace-normal break-words"
                    checked={value}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            {!isPlatform && (
              <Controller
                name="calVideoSettings.disableTranscriptionForGuests"
                defaultValue={!!calVideoSettings?.disableTranscriptionForGuests}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("disable_transcription_for_guests")}
                      labelClassName="text-sm leading-6 whitespace-normal break-words"
                      checked={value}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}
            {!isPlatform && (
              <Controller
                name="calVideoSettings.disableTranscriptionForOrganizer"
                defaultValue={!!calVideoSettings?.disableTranscriptionForOrganizer}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("disable_transcription_for_organizer")}
                      labelClassName="text-sm leading-6 whitespace-normal break-words"
                      checked={value}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            <Controller
              name="calVideoSettings.requireEmailForGuests"
              defaultValue={!!calVideoSettings?.requireEmailForGuests}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("require_email_for_guests")}
                    description={t("require_email_for_guests_description")}
                    labelClassName="text-sm leading-6 whitespace-normal break-words"
                    checked={value}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            <TextField
              label={t("enter_redirect_url_on_exit_description")}
              defaultValue={calVideoSettings?.redirectUrlOnExit || ""}
              data-testid="calVideoSettings.redirectUrlOnExit"
              containerClassName="mt-4"
              className="leading-6"
              {...formMethods.register("calVideoSettings.redirectUrlOnExit", {
                setValueAs: (v) => (!v || v.trim() === "" ? null : v),
              })}
            />
            <ErrorMessage
              errors={formMethods.formState.errors?.calVideoSettings}
              name="redirectUrlOnExit"
              className={classNames("text-error text-sm")}
              as="div"
              id="calVideoSettings.redirectUrlOnExit-error"
            />
          </LocationSettingsContainer>
        )}
      </div>
    </>
  );
};

export default CalVideoSettings;
