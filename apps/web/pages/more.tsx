import Shell, { MobileNavigationMoreItems } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function MorePage() {
  const { t } = useLocale();
  return (
    <Shell>
      <div className="max-w-screen-lg">
        <MobileNavigationMoreItems />
        <p className="text-subtle mt-6 text-xs leading-tight md:hidden">{t("more_page_footer")}</p>
      </div>
    </Shell>
  );
}
