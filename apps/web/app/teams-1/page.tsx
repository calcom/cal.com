import TeamsPage from "@pages/teams/index";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { ssrInit } from "@server/lib/ssr";

const getServerSideProps = async ({ headers, cookies }) => {
  const ssr = await ssrInit({
    headers,
    cookies,
  });
  await ssr.viewer.me.prefetch();
  const session = await getServerSession({ req: context.req, res: context.res });
  const token = Array.isArray(context.query?.token) ? context.query.token[0] : context.query?.token;

  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;

  if (!session) {
    return {
      redirect: {
        destination: callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login",
        permanent: false,
      },
      props: {},
    };
  }

  return ssr.dehydrate();
};

export default async function Teams() {
  const { t } = useLocale();
  const headers = nextHeaders();
  const cookies = nextCookies();
  await getServerSideProps({ params, headers, cookies });
  const [user] = trpc.viewer.me.useSuspenseQuery();

  return <TeamsPage />;
}
