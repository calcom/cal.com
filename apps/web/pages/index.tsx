import { NextPageContext } from "next";

import { getSession } from "@lib/auth";

function RedirectPage() {
  return;
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { destination: "https://mento.co" } };
    // return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
