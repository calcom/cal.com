import type { GetServerSidePropsContext } from "next";

import { getSlimServerSession } from "@calcom/features/auth/lib/getSlimServerSession";

function RedirectPage() {
  return;
}

export async function getServerSideProps({ req, res: _res }: GetServerSidePropsContext) {
  const session = await getSlimServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
