import type { GetServerSidePropsContext } from "next/types";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { code, state } = context.query;
  const session = await getServerSession(context);
  const user = session?.user;
  if (!user) return null;

  if (code && typeof code === "string") {
    const query = new URLSearchParams({
      code,
      userId: String(user.id),
    });
    if (typeof state === "string") {
      query.set("state", state);
    }
    return {
      redirect: {
        destination: `/api/import/calendly/callback?${query.toString()}`,
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

const CalendlyImportComponent = () => <div>Redirecting...</div>;

export default CalendlyImportComponent;
