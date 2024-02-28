import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(_: GetServerSidePropsContext): Promise<any> {
  return { redirect: { permanent: false, destination: process.env.NEXT_PUBLIC_FUNNELHUB_URL } };
}
