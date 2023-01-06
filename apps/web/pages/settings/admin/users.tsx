import { GetServerSidePropsContext } from "next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getLayout } from "@components/auth/layouts/AdminLayout";

import { ssrInit } from "@server/lib/ssr";

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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default AdminUsersView;
