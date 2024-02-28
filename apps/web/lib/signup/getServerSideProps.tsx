import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (_: GetServerSidePropsContext) => {
  return { redirect: { permanent: false, destination: process.env.NEXT_PUBLIC_FUNNELHUB_URL } };
};
