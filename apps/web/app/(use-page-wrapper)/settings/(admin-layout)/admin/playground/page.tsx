import { _generateMetadata, getTranslate } from "app/_utils";
import Link from "next/link";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

const LINKS = [
  {
    title: "Routing Funnel",
    href: "/settings/admin/playground/routing-funnel",
  },
  {
    title: "Bookings by Hour",
    href: "/settings/admin/playground/bookings-by-hour",
  },
  {
    title: "Weekly Calendar",
    href: "/settings/admin/playground/weekly-calendar",
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
      <div>
        <ul className="mt-8">
          {LINKS.map((link) => (
            <li key={link.title}>
              <Link href={link.href} className="list-item list-disc font-medium underline">
                {link.title} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SettingsHeader>
  );
};

export default Page;
