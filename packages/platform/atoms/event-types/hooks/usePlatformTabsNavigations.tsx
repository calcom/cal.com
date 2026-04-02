"use client";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { EventTypeSetupProps, FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { PlatformTabs } from "../../event-types/wrappers/types";

type Props = {
  formMethods: UseFormReturn<FormValues>;
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
  tabs: PlatformTabs[];
};
export const usePlatformTabsNavigations = ({ formMethods, eventType, team, tabs }: Props) => {
  const [url, setUrl] = useState("");
  const [currentTab, setCurrentTab] = useState<PlatformTabs>(tabs[0]);

  useEffect(() => {
    // Get the current URL from window.location
    const currentUrl = window.location.href;
    setUrl(currentUrl);
  }, []);

  const { t } = useLocale();

  const length = formMethods.watch("length");
  const multipleDuration = formMethods.watch("metadata")?.multipleDuration;

  const watchSchedulingType = formMethods.watch("schedulingType");
  const watchChildrenCount = formMethods.watch("children").length;
  const availability = formMethods.watch("availability");

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  const EventTypeTabs = useMemo(() => {
    const navigation: VerticalTabItemProps[] = getNavigation({
      t,
      length,
      multipleDuration,
      id: formMethods.getValues("id"),
      tabs,
      url,
      onClick: (tab) => {
        setCurrentTab(tab);
      },
      currentTab,
    });

    if (!requirePayment && tabs.includes("recurring")) {
      navigation.splice(3, 0, {
        name: t("recurring"),
        onClick: () => setCurrentTab("recurring"),
        isActive: currentTab === "recurring",
        href: `${url}?tabName=recurring`,
        icon: "repeat",
        info: t(`recurring_event_tab_description`),
        "data-testid": "recurring",
      });
    }

    tabs.includes("availability") &&
      navigation.splice(1, 0, {
        name: t("availability"),
        onClick: () => setCurrentTab("availability"),
        isActive: currentTab === "availability",
        href: `${url}?tabName=availability`,
        icon: "calendar",
        info:
          isManagedEventType || isChildrenManagedEventType
            ? formMethods.getValues("schedule") === null
              ? t("members_default_schedule")
              : isChildrenManagedEventType
                ? `${
                    formMethods.getValues("scheduleName")
                      ? `${formMethods.getValues("scheduleName")} - ${t("managed")}`
                      : t("default_schedule_name")
                  }`
                : (formMethods.getValues("scheduleName") ?? t("default_schedule_name"))
            : (formMethods.getValues("scheduleName") ?? t("default_schedule_name")),
        "data-testid": "availability",
      });

    // If there is a team put this navigation item within the tabs
    if (team && tabs.includes("team")) {
      navigation.splice(2, 0, {
        name: t("assignment"),
        onClick: () => setCurrentTab("team"),
        isActive: currentTab === "team",
        href: `${url}?tabName=team`,
        icon: "users",
        info: `${t(watchSchedulingType?.toLowerCase() ?? "")}${
          isManagedEventType ? ` - ${t("number_member", { count: watchChildrenCount || 0 })}` : ""
        }`,
        "data-testid": "assignment",
      });
    }

    return navigation;
  }, [
    t,
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
    url,
    tabs,
    currentTab,
  ]);

  return { tabsNavigation: EventTypeTabs, currentTab };
};

type getNavigationProps = {
  t: TFunction;
  length: number;
  id: number;
  multipleDuration?: EventTypeSetupProps["eventType"]["metadata"]["multipleDuration"];
  tabs: PlatformTabs[];
  url: string;
  onClick: (tab: PlatformTabs) => void;
  currentTab: PlatformTabs;
};

function getNavigation({ length, multipleDuration, t, tabs, url, onClick, currentTab }: getNavigationProps) {
  const duration = multipleDuration?.map((duration) => ` ${duration}`) || length;
  const tabsNavigation: VerticalTabItemProps[] = [];
  tabs.includes("setup") &&
    tabsNavigation.push({
      name: t("basics"),
      onClick: () => onClick("setup"),
      isActive: currentTab === "setup",
      href: `${url}?tabName=setup`,
      icon: "link",
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
      "data-testid": `basics`,
    });
  tabs.includes("limits") &&
    tabsNavigation.push({
      name: t("event_limit_tab_title"),
      onClick: () => onClick("limits"),
      isActive: currentTab === "limits",
      href: `${url}?tabName=limits`,
      icon: "clock",
      info: t(`event_limit_tab_description`),
      "data-testid": "event_limit_tab_title",
    });

  tabs.includes("advanced") &&
    tabsNavigation.push({
      name: t("event_advanced_tab_title"),
      onClick: () => onClick("advanced"),
      isActive: currentTab === "advanced",
      href: `${url}?tabName=advanced`,
      icon: "sliders-vertical",
      info: t(`event_advanced_tab_description`),
      "data-testid": "event_advanced_tab_title",
    });
  tabs.includes("payments") &&
    tabsNavigation.push({
      name: t("payments"),
      onClick: () => onClick("payments"),
      isActive: currentTab === "payments",
      href: `${url}?tabName=payments`,
      icon: "credit-card",
      info: t(`event_payments_tab_description`),
      "data-testid": "payments",
    });

  return tabsNavigation;
}
