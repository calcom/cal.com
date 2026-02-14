"use client";

// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { TFunction } from "i18next";
import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type {
  EventTypeSetupProps,
  AvailabilityOption,
  FormValues,
  EventTypeApps,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

type Props = {
  formMethods: UseFormReturn<FormValues>;
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
  eventTypeApps?: EventTypeApps;
  allActiveWorkflows?: Workflow[];
  canReadWorkflows?: boolean;
};
export const useTabsNavigations = ({
  formMethods,
  eventType,
  team,
  eventTypeApps,
  allActiveWorkflows,
  canReadWorkflows = false,
}: Props) => {
  const { t } = useLocale();

  const length = formMethods.watch("length");
  const multipleDuration = formMethods.watch("metadata")?.multipleDuration;

  const watchSchedulingType = formMethods.watch("schedulingType");
  const watchChildrenCount = formMethods.watch("children").length;
  const availability = formMethods.watch("availability");
  const appsMetadata = formMethods.getValues("metadata")?.apps;

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  let enabledAppsNumber = 0;

  if (appsMetadata) {
    enabledAppsNumber = Object.entries(appsMetadata).filter(
      ([appId, appData]) =>
        eventTypeApps?.items.find((app) => app.slug === appId)?.isInstalled && appData.enabled
    ).length;
  }
  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });

  const requirePayment = paymentAppData.price > 0;

  const activeWebhooksNumber = eventType.webhooks.filter((webhook) => webhook.active).length;

  const installedAppsNumber = eventTypeApps?.items.filter((app) => app.isInstalled).length || 0;
  const enabledWorkflowsNumber = allActiveWorkflows ? allActiveWorkflows.length : 0;

  const eventTypeId = formMethods.getValues("id");

  const EventTypeTabs = useMemo(() => {
    const navigation: VerticalTabItemProps[] = getNavigation({
      t,
      length,
      multipleDuration,
      id: eventTypeId,
      enabledAppsNumber,
      installedAppsNumber,
      enabledWorkflowsNumber,
      availability,
      canReadWorkflows,
    });

    if (!requirePayment) {
      navigation.splice(3, 0, {
        name: t("recurring"),
        href: `/event-types/${eventTypeId}?tabName=recurring`,
        icon: "repeat",
        info: t(`recurring_event_tab_description`),
        "data-testid": "recurring",
      });
    }
    navigation.splice(1, 0, {
      name: t("availability"),
      href: `/event-types/${eventTypeId}?tabName=availability`,
      icon: "calendar",
      info:
        isManagedEventType || isChildrenManagedEventType
          ? formMethods.getValues("schedule") === null
            ? t("members_default_schedule")
            : isChildrenManagedEventType
              ? `${
                  formMethods.getValues("scheduleName")
                    ? `${formMethods.getValues("scheduleName")} - ${t("managed")}`
                    : t(`default_schedule_name`)
                }`
              : (formMethods.getValues("scheduleName") ?? t(`default_schedule_name`))
          : (formMethods.getValues("scheduleName") ?? t(`default_schedule_name`)),
      "data-testid": "availability",
    });
    // If there is a team put this navigation item within the tabs
    if (team) {
      navigation.splice(2, 0, {
        name: t("assignment"),
        href: `/event-types/${eventTypeId}?tabName=team`,
        icon: "users",
        info: `${t(watchSchedulingType?.toLowerCase() ?? "")}${
          isManagedEventType ? ` - ${t("number_member", { count: watchChildrenCount || 0 })}` : ""
        }`,
        "data-testid": "assignment",
      });
    }
    const showInstant = !(isManagedEventType || isChildrenManagedEventType);
    if (showInstant) {
      if (team) {
        navigation.push({
          name: t("instant_tab_title"),
          href: `/event-types/${eventType.id}?tabName=instant`,
          icon: "phone-call",
          info: t(`instant_event_tab_description`),
          "data-testid": "instant_tab_title",
        });
      }
    }
    navigation.push({
      name: t("webhooks"),
      href: `/event-types/${eventTypeId}?tabName=webhooks`,
      icon: "webhook",
      info: `${activeWebhooksNumber} ${t("active")}`,
      "data-testid": "webhooks",
    });
    return navigation;
  }, [
    t,
    enabledAppsNumber,
    installedAppsNumber,
    enabledWorkflowsNumber,
    availability,
    isManagedEventType,
    isChildrenManagedEventType,
    team,
    length,
    requirePayment,
    multipleDuration,
    eventTypeId,
    watchSchedulingType,
    watchChildrenCount,
    activeWebhooksNumber,
    canReadWorkflows,
    eventType.id,
    formMethods,
  ]);

  return { tabsNavigation: EventTypeTabs };
};

type getNavigationProps = {
  t: TFunction;
  length: number;
  id: number;
  multipleDuration?: EventTypeSetupProps["eventType"]["metadata"]["multipleDuration"];
  enabledAppsNumber: number;
  enabledWorkflowsNumber: number;
  installedAppsNumber: number;
  availability: AvailabilityOption | undefined;
  canReadWorkflows: boolean;
};

function getNavigation({
  length,
  id,
  multipleDuration,
  t,
  enabledAppsNumber,
  installedAppsNumber,
  enabledWorkflowsNumber,
  canReadWorkflows,
}: getNavigationProps) {
  const duration = multipleDuration?.map((duration) => ` ${duration}`) || length;

  const baseNavigation: VerticalTabItemProps[] = [
    {
      name: t("basics"),
      href: `/event-types/${id}?tabName=setup`,
      icon: "link",
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
      "data-testid": `basics`,
    },
    {
      name: t("event_limit_tab_title"),
      href: `/event-types/${id}?tabName=limits`,
      icon: "clock",
      info: t(`event_limit_tab_description`),
      "data-testid": "event_limit_tab_title",
    },
    {
      name: t("event_advanced_tab_title"),
      href: `/event-types/${id}?tabName=advanced`,
      icon: "sliders-vertical",
      info: t(`event_advanced_tab_description`),
      "data-testid": "event_advanced_tab_title",
    },
    {
      name: t("apps"),
      href: `/event-types/${id}?tabName=apps`,
      icon: "grid-3x3",
      //TODO: Handle proper translation with count handling
      info: `${installedAppsNumber} apps, ${enabledAppsNumber} ${t("active")}`,
      "data-testid": "apps",
    },
  ];

  // Only add workflows tab if user has permission to read workflows
  if (canReadWorkflows) {
    baseNavigation.push({
      name: t("workflows"),
      href: `/event-types/${id}?tabName=workflows`,
      icon: "zap",
      info: `${enabledWorkflowsNumber} ${t("active")}`,
      "data-testid": "workflows",
    });
  }

  return baseNavigation;
}
