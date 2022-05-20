import RoutingFormsApp from "@calcom/app-store/routing-forms/pages/[...page]";

const AppsMap = {
  "routing-forms": RoutingFormsApp,
};

export default function AppPage({ appName, page }) {
  const Component = AppsMap[appName];
  return (
    <div>
      <h1>App Page - {page}</h1>
      <Component page={page} />
    </div>
  );
}
export const getServerSideProps = async (ctx) => {
  const params = ctx.params;
  return {
    props: {
      page: params.page,
      appName: params.slug,
    },
  };
};
