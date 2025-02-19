import { _generateMetadata, getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";
import { MobileNavigationMoreItems } from "@calcom/features/shell/navigation/Navigation";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("more"),
    () => ""
  );
};

const ServerPageWrapper = async () => {
  const t = await getTranslate();
  return (
    <Shell withoutSeo={true}>
      <div className="max-w-screen-lg">
        <MobileNavigationMoreItems />
        <p className="text-subtle mt-6 text-xs leading-tight md:hidden">{t("more_page_footer")}</p>
      </div>
    </Shell>
  );
};

export default ServerPageWrapper;

export const dynamic = "force-static";
