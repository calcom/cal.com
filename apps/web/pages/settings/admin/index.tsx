import { GetServerSidePropsContext } from "next";

import { Meta } from "@calcom/ui";

import { getLayout } from "@components/auth/layouts/AdminLayout";

import { ssrInit } from "@server/lib/ssr";

function AdminAppsView() {
  return (
    <>
      <Meta title="Admin" description="admin_description" />
      <h1>Admin index</h1>
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
