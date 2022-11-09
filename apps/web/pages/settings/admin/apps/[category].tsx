import { useRouter } from "next/router";

import AppCategoryNavigaton from "@calcom/app-store/_components/AppCategoryNavigation";
import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui/v2";
import type { HorizontalTabItemProps, VerticalTabItemProps } from "@calcom/ui/v2";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

function AdminAppsView() {
  const { t } = useLocale();
  const router = useRouter();
  const category = router.query.category;

  return (
    <>
      <Meta title="Apps" description="apps_description" />

      <AppCategoryNavigation baseURL="/settings/admin/apps">
        <h1>Apps</h1>
      </AppCategoryNavigation>
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;
