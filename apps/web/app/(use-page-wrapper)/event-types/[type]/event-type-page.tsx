"use client";

import { useEffect, useState } from "react";

import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";
import { Shell } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { VerticalTabs } from "@calcom/ui/components/navigation";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

interface EventTypePageProps {
  id: number;
  data: any; // Replace with proper type
}

export default function EventTypePage({ id, data }: EventTypePageProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<string>("setup");

  const tabsNavigation: VerticalTabItemProps[] = [
    {
      name: t("event_setup"),
      href: `/event-types/${id}?tabName=setup`,
      icon: "calendar",
      info: t("15_mins"),
    },
    {
      name: t("availability"),
      href: `/event-types/${id}?tabName=availability`,
      icon: "clock",
      info: t("working_hours"),
    },
    {
      name: t("limits"),
      href: `/event-types/${id}?tabName=limits`,
      icon: "sliders",
      info: t("how_often_you_can_be_booked"),
    },
    {
      name: t("advanced"),
      href: `/event-types/${id}?tabName=advanced`,
      icon: "settings",
      info: t("calendar_settings_and_more"),
    },
    {
      name: t("recurring"),
      href: `/event-types/${id}?tabName=recurring`,
      icon: "repeat",
      info: t("set_up_a_repeating_schedule"),
    },
    {
      name: t("apps"),
      href: `/event-types/${id}?tabName=apps`,
      icon: "grid",
      info: t("0_apps_0_active", { count: 0, active: 0 }),
    },
    {
      name: t("workflows"),
      href: `/event-types/${id}?tabName=workflows`,
      icon: "zap",
      info: t("0_active", { count: 0 }),
    },
    {
      name: t("webhooks"),
      href: `/event-types/${id}?tabName=webhooks`,
      icon: "link",
      info: t("0_active", { count: 0 }),
    },
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabName = urlParams.get("tabName");
    if (tabName) {
      setActiveTab(tabName);
    }
  }, []);

  return (
    <Shell
      title={`${data?.eventType?.title || ""} | ${t("event_type")}`}
      heading={data?.eventType?.title || ""}
      subtitle={t("manage_event_type_settings")}
      backPath="/event-types">
      <div className="flex flex-col xl:flex-row xl:space-x-6">
        <div className="hidden xl:block">
          <VerticalTabs
            className="primary-navigation w-64"
            tabs={tabsNavigation}
            sticky
            linkShallow
            itemClassname="items-start"
          />
        </div>
        <div className="w-full ltr:mr-2 rtl:ml-2">
          <div className="bg-default border-subtle mt-4 rounded-md sm:mx-0 md:border md:p-6 xl:mt-0">
            <EventTypeWebWrapper id={id} data={data} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
