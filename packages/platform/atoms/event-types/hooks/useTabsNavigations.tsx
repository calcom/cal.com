"use client";

// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { TFunction } from "next-i18next";
import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type {
  EventTypeSetupProps,
  AvailabilityOption,
  FormValues,
  EventTypeApps,
} from "@calcom/features/eventtypes/lib/types";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui";

type Props = {
  formMethods: UseFormReturn<FormValues>;
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
  eventTypeApps?: EventTypeApps;
  allActiveWorkflows?: Workflow[];
};
export const useTabsNavigations = ({
  formMethods,
  eventType,
  team,
  eventTypeApps,
  allActiveWorkflows,
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
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  const activeWebhooksNumber = eventType.webhooks.filter((webhook) => webhook.active).length;

  const installedAppsNumber = eventTypeApps?.items.length || 0;

  const enabledWorkflowsNumber = allActiveWorkflows ? allActiveWorkflows.length : 0;

  const EventTypeTabs = useMemo(() => {
    const navigation: VerticalTabItemProps[] = getNavigation({
      t,
      length,
      multipleDuration,
      id: formMethods.getValues("id"),
      enabledAppsNumber,
      installedAppsNumber,
      enabledWorkflowsNumber,
      availability,
    });

    if (!requirePayment) {
      navigation.splice(3, 0, {
        name: "recurring",
        href: `/event-types/${formMethods.getValues("id")}?tabName=recurring`,
        icon: "repeat",
        info: `recurring_event_tab_description`,
      });
    }
    navigation.splice(1, 0, {
      name: "availability",
      href: `/event-types/${formMethods.getValues("id")}?tabName=availability`,
      icon: "calendar",
      info:
        isManagedEventType || isChildrenManagedEventType
          ? formMethods.getValues("schedule") === null
            ? "members_default_schedule"
            : isChildrenManagedEventType
            ? `${
                formMethods.getValues("scheduleName")
                  ? `${formMethods.getValues("scheduleName")} - ${t("managed")}`
                  : `default_schedule_name`
              }`
            : formMethods.getValues("scheduleName") ?? `default_schedule_name`
          : formMethods.getValues("scheduleName") ?? `default_schedule_name`,
    });
    // If there is a team put this navigation item within the tabs
    if (team) {
      navigation.splice(2, 0, {
        name: "assignment",
        href: `/event-types/${formMethods.getValues("id")}?tabName=team`,
        icon: "users",
        info: `${t(watchSchedulingType?.toLowerCase() ?? "")}${
          isManagedEventType ? ` - ${t("number_member", { count: watchChildrenCount || 0 })}` : ""
        }`,
      });
    }
    const showInstant = !(isManagedEventType || isChildrenManagedEventType);
    if (showInstant) {
      if (team) {
        navigation.push({
          name: "instant_tab_title",
          href: `/event-types/${eventType.id}?tabName=instant`,
          icon: "phone-call",
          info: `instant_event_tab_description`,
        });
      }
    }
    navigation.push({
      name: "webhooks",
      href: `/event-types/${formMethods.getValues("id")}?tabName=webhooks`,
      icon: "webhook",
      info: `${activeWebhooksNumber} ${t("active")}`,
    });
    const hidden = true; // hidden while in alpha trial. you can access it with tabName=ai
    if (team && hidden) {
      navigation.push({
        name: "Cal.ai",
        href: `/event-types/${eventType.id}?tabName=ai`,
        icon: "sparkles",
        info: "cal_ai_event_tab_description", // todo `cal_ai_event_tab_description`,
      });
    }
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
    formMethods.getValues("id"),
    watchSchedulingType,
    watchChildrenCount,
    activeWebhooksNumber,
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
};

function getNavigation({
  length,
  id,
  multipleDuration,
  t,
  enabledAppsNumber,
  installedAppsNumber,
  enabledWorkflowsNumber,
}: getNavigationProps) {
  const duration = multipleDuration?.map((duration) => ` ${duration}`) || length;

  return [
    {
      name: "event_setup_tab_title",
      href: `/event-types/${id}?tabName=setup`,
      icon: "link",
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
    },
    {
      name: "event_limit_tab_title",
      href: `/event-types/${id}?tabName=limits`,
      icon: "clock",
      info: `event_limit_tab_description`,
    },
    {
      name: "event_advanced_tab_title",
      href: `/event-types/${id}?tabName=advanced`,
      icon: "sliders-vertical",
      info: `event_advanced_tab_description`,
    },
    {
      name: "apps",
      href: `/event-types/${id}?tabName=apps`,
      icon: "grid-3x3",
      //TODO: Handle proper translation with count handling
      info: `${installedAppsNumber} apps, ${enabledAppsNumber} ${t("active")}`,
    },
    {
      name: "workflows",
      href: `/event-types/${id}?tabName=workflows`,
      icon: "zap",
      info: `${enabledWorkflowsNumber} ${t("active")}`,
    },
  ] satisfies VerticalTabItemProps[];
}
