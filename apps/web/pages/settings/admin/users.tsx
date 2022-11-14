import { useLocale } from "@calcom/lib/hooks/useLocale";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

function AdminUsersView() {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("users")} description={t("users_description")} />
      <h1>{t("users_listing")}</h1>
    </>
  );
}

AdminUsersView.getLayout = getLayout;

export default AdminUsersView;
