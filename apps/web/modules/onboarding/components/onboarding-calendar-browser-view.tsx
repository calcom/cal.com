"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, type IconName } from "@calcom/ui/components/icon";

export const OnboardingCalendarBrowserView = () => {
  const { t } = useLocale();
  const webappUrl = WEBAPP_URL.replace(/^https?:\/\//, "");

  const calendarIntegrations: Array<{
    name: string;
    description: string;
    icon: IconName;
  }> = [
    {
      name: t("google_calendar"),
      description: t("onboarding_calendar_browser_view_google_description"),
      icon: "calendar",
    },
    {
      name: t("outlook_calendar"),
      description: t("onboarding_calendar_browser_view_outlook_description"),
      icon: "mail",
    },
    {
      name: t("apple_calendar"),
      description: t("onboarding_calendar_browser_view_apple_description"),
      icon: "calendar-days",
    },
  ];

  return (
    <div className="bg-default border-subtle hidden h-full w-full flex-col rounded-l-2xl border xl:flex">
      {/* Browser header */}
      <div className="border-subtle flex min-w-0 shrink-0 items-center gap-3 rounded-t-2xl border-b bg-white p-3">
        {/* Navigation buttons */}
        <div className="flex shrink-0 items-center gap-4 opacity-50">
          <Icon name="arrow-left" className="text-subtle h-4 w-4" />
          <Icon name="arrow-right" className="text-subtle h-4 w-4" />
          <Icon name="rotate-cw" className="text-subtle h-4 w-4" />
        </div>
        <div className="bg-muted flex w-full items-center gap-2 rounded-[32px] px-3 py-2">
          <Icon name="lock" className="text-subtle h-4 w-4" />
          <p className="text-default text-sm font-medium leading-tight">{webappUrl}/settings/calendars</p>
        </div>
        <Icon name="ellipsis-vertical" className="text-subtle h-4 w-4" />
      </div>
      {/* Content */}
      <div className="bg-muted h-full pl-11 pt-11">
        <div className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-xl border">
          {/* Header */}
          <div className="border-subtle flex flex-col gap-4 border-b p-4">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-emphasis text-xl font-semibold leading-tight">
                {t("connect_your_calendar")}
              </h2>
              <p className="text-subtle text-sm leading-normal">
                {t("onboarding_calendar_browser_view_subtitle")}
              </p>
            </div>
          </div>

          {/* Calendar Integrations List */}
          <div className="flex flex-col overflow-y-auto">
            {calendarIntegrations.map((integration, index) => (
              <div key={integration.name} className="opacity-30">
                {index > 0 && <div className="border-subtle h-px border-t" />}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon name={integration.icon} className="text-emphasis h-5 w-5" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h3 className="text-default text-sm font-semibold leading-none">{integration.name}</h3>
                      <p className="text-subtle text-sm font-medium leading-tight">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emphasis flex h-6 items-center justify-center rounded-md px-2">
                    <span className="text-emphasis text-xs font-medium leading-none">{t("connected")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
