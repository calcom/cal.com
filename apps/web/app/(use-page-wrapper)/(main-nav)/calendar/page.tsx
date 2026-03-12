import UnifiedCalendarPage from "@calid/features/modules/unifiedCalendar";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("unified_calendar_heading"),
    (t) => t("unified_calendar_subtitle"),
    undefined,
    undefined,
    "/calendar"
  );
};

const Page = async ({ searchParams: _searchParams }: PageProps) => {
  const t = await getTranslate();

  return (
    <ShellMainAppDir heading={t("unified_calendar_heading")} subtitle={t("unified_calendar_subtitle")}>
      <UnifiedCalendarPage />
    </ShellMainAppDir>
  );
};

export default Page;
