import { InferGetServerSidePropsType } from "next";

import { getSession } from "@lib/auth";

function RedirectPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (Math.random() > 1) console.log(props);
  return null;
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/bookings/upcoming" } };
}

export default RedirectPage;
