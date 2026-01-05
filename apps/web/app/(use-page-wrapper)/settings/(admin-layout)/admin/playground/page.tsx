import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Icon } from "@calcom/ui/components/icon";
import { _generateMetadata, getTranslate } from "app/_utils";
import Link from "next/link";

const LINKS = [
  {
    title: "Experiments",
    description: "Test A/B experiment variants and PostHog tracking",
    href: "/settings/admin/playground/experiments",
    icon: "flask-conical" as const,
  },
  {
    title: "Routing Funnel",
    description: "Visualize booking conversion flow and routing patterns",
    href: "/settings/admin/playground/routing-funnel",
    icon: "filter" as const,
  },
  {
    title: "Bookings by Hour",
    description: "View booking distribution across different hours",
    href: "/settings/admin/playground/bookings-by-hour",
    icon: "chart-bar" as const,
  },
  {
    title: "Weekly Calendar",
    description: "Interactive weekly calendar view for scheduling",
    href: "/settings/admin/playground/weekly-calendar",
    icon: "calendar" as const,
  },
  {
    title: "Date Range Filter",
    description: "Test date range selection and filtering components",
    href: "/settings/admin/playground/date-range-filter",
    icon: "calendar-days" as const,
  },
];

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("playground"),
    (t) => t("admin_playground_description"),
    undefined,
    undefined,
    "/settings/admin/playground"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("playground")} description={t("admin_playground_description")}>
      <div class="mt-6">
        <div class="bg-default border-subtle divide-subtle flex flex-col divide-y rounded-md border">
          {LINKS.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              class="hover:bg-muted group flex items-center gap-4 p-5 transition-colors">
              <div class="bg-emphasis/10 group-hover:bg-emphasis/20 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md transition-colors">
                <Icon name={link.icon} class="text-emphasis h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-emphasis text-sm font-semibold leading-none">{link.title}</h3>
                <p class="text-subtle mt-2 text-sm">{link.description}</p>
              </div>
              <Icon
                name="arrow-right"
                class="text-subtle group-hover:text-emphasis h-4 w-4 flex-shrink-0 transition-colors"
              />
            </Link>
          ))}
        </div>
      </div>
    </SettingsHeader>
  );
};

export default Page;
