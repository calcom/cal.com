import Shell, { MobileNavigationMoreItems } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function MorePage() {
  const { t } = useLocale();
  return (
    <Shell>
      <div className="mt-8 max-w-screen-lg">
        <MobileNavigationMoreItems />
        {/* Save it for next preview version
         <div className="mt-6">
          <UserV2OptInBanner />
        </div> */}
        <p className="mt-6 text-xs leading-tight text-gray-500 md:hidden">{t("more_page_footer")}</p>
      </div>
    </Shell>
  );
}
