import SetupPage from "@pages/apps/[slug]/setup";
import { _generateMetadata } from "_app/_utils";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  return await _generateMetadata(
    () => `${params.slug} | ${APP_NAME}`,
    () => ""
  );
};

const getPageProps = async ({ params }: { params: Record<string, string | string[]> }) => {
  const req = { headers: headers(), cookies: cookies() };

  const result = await getServerSideProps({ params, req } as unknown as GetServerSidePropsContext);

  if (!result || "notFound" in result) {
    notFound();
  }

  if ("redirect" in result) {
    redirect(result.redirect.destination);
  }

  return result.props;
};

export default async function Page({ params }: { params: Record<string, string | string[]> }) {
  const pageProps = await getPageProps({ params });
  return <SetupPage {...pageProps} />;
}
