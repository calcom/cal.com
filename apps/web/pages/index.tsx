import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

function RedirectPage() {
  return;
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  if (session.user) {
    const { belongsToActiveTeam = false, twoFactorEnabled = false } = session.user;
    if (belongsToActiveTeam && !twoFactorEnabled) {
      return { redirect: { permanent: false, destination: "/settings/security/two-factor-auth" } };
    }
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
