import { GetServerSidePropsContext } from "next";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ssrInit } from "@calcom/trpc/server/ssr";
import { Meta } from "@calcom/ui";

import { getLayout } from "@components/auth/layouts/AdminLayout";

function AdminAppsView() {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("apps")} description={t("admin_apps_description")} />
      <AdminAppsList baseURL="/settings/admin/apps" />
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default AdminAppsView;
