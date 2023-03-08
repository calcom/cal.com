import type { GetServerSidePropsContext } from "next";
import { AUTH_OPTIONS } from "pages/api/auth/[...nextauth]";

import { getServerSession } from "@calcom/lib/auth";

function RedirectPage() {
  return;
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const session = await getServerSession({ req, res, authOptions: AUTH_OPTIONS });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
