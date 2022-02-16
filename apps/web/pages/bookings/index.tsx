import { NextPageContext } from "next";

import { getSession } from "@lib/auth";

function RedirectPage() {
  return null;
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/bookings/upcoming" } };
}

export default RedirectPage;
