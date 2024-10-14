import { getAppRegistry } from "@calcom/app-store/_appRegistry";

export const getServerSideProps = async () => {
  const appStore = await getAppRegistry();

  const zohoCalendar = appStore.find((app) => "zohocalendar" === app.slug);
  return {
    props: {
      zohoCalendar,
    },
  };
};
