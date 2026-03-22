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
    <ShellMainAppDir
      heading={
        <span className="inline-flex items-center gap-2">
          <span>{t("unified_calendar_heading")}</span>
          <span className="bg-subtle text-default border-subtle inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wide">
            Beta
          </span>
        </span>
      }
      subtitle={t("unified_calendar_subtitle")}>
      <UnifiedCalendarPage />
    </ShellMainAppDir>
  );
};

export default Page;
