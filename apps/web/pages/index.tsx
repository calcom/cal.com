import { NextPageContext } from "next";

import { CUSTOM_ROOT_URL } from "@calcom/web/lib/config/constants";

import { getSession } from "@lib/auth";

function RedirectPage() {
  return;
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: `${CUSTOM_ROOT_URL}` } };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
