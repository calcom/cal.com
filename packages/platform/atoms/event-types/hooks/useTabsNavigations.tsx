"use client";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type {
  AvailabilityOption,
  EventTypeApps,
  EventTypeSetupProps,
  FormValues,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { TFunction } from "i18next";
import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";

type Props = {
  formMethods: UseFormReturn<FormValues>;
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
  eventTypeApps?: EventTypeApps;
};
export const useTabsNavigations = ({
  formMethods,
  eventType,
  team,
  eventTypeApps,
}: Props) => {
  const { t } = useLocale();

  const length = formMethods.watch("length");
  const multipleDuration = formMethods.watch("metadata")?.multipleDuration;

  const watchSchedulingType = formMethods.watch("schedulingType");
  const watchChildrenCount = formMethods.watch("children").length;
  const availability = formMethods.watch("availability");
  const appsMetadata = formMethods.getValues("metadata")?.apps;

  const isManagedEventType = eventType.schedulingType === "MANAGED";
  const isChildrenManagedEventType = false;

  let enabledAppsNumber = 0;

  if (appsMetadata) {
    enabledAppsNumber = Object.entries(appsMetadata).filter(
      ([appId, appData]) =>
        eventTypeApps?.items.find((app) => app.slug === appId)?.isInstalled &&
        (appData as { enabled?: boolean } | undefined)?.enabled
    ).length;
  }
  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });

  const requirePayment = paymentAppData.price > 0;

  const activeWebhooksNumber = eventType.webhooks.filter((webhook) => webhook.active).length;

  const installedAppsNumber = eventTypeApps?.items.filter((app) => app.isInstalled).length || 0;

  const eventTypeId = formMethods.getValues("id");

  const EventTypeTabs = useMemo(() => {
    const navigation: VerticalTabItemProps[] = getNavigation({
      t,
      length,
      multipleDuration,
      id: eventTypeId,
      enabledAppsNumber,
      installedAppsNumber,
      availability,
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
      info: `${t("number_apps", { count: installedAppsNumber })}, ${enabledAppsNumber} ${t("active")}`,
      "data-testid": "apps",
    },
  ];

  return baseNavigation;
}
