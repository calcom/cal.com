import { getSession } from "@lib/auth";
import { NextPageContext } from "next";

function RedirectPage() {
  return;
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
