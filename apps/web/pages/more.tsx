import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MobileNavigationMoreItem, mobileNavigationMoreItems } from "@calcom/ui/Shell";
import { Shell } from "@calcom/ui/v2";

export default function MorePage() {
  const { t } = useLocale();
  return (
    <Shell>
      <div className="max-w-screen-lg">
        <ul className="mt-2 rounded-md border">
          {mobileNavigationMoreItems.map((item) => (
            <MobileNavigationMoreItem key={item.name} item={item} />
          ))}
        </ul>
        <p className="mt-6 text-xs leading-tight text-gray-500 md:hidden">{t("more_page_footer")}</p>
      </div>
    </Shell>
  );
}
