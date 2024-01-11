import type { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res } = context;

  const session = await getServerSession({ req });

  // @TODO res will not be available in future pages (app dir)
  if (session) {
    res.writeHead(302, { Location: "/" });
    res.end();
    return { props: {} };
  }
  const locale = await getLocale(context.req);

  return {
    props: {
      csrfToken: await getCsrfToken(context),
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
