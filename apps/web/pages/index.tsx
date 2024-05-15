import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

function RedirectPage() {
  return;
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const session = await getServerSession({ req, res });

  console.log(session);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: process.env.NEXT_PUBLIC_FUNNELHUB_URL } };
  }

  if (!session.user.currentWorkspace?.accessType.includes("CALENDAR")) {
    return { redirect: { permanent: false, destination: process.env.NEXT_PUBLIC_FUNNELHUB_URL } };
  }

  return {
    redirect: {
      permanent: false,
      destination: "/event-types",
    },
  };
}

export default RedirectPage;
