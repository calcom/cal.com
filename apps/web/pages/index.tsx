import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { DEFAULT_PAGE } from "@calcom/lib/constants";

function RedirectPage() {
  return;
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: DEFAULT_PAGE } };
}

export default RedirectPage;
