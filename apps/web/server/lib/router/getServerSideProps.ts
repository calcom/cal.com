import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl } from "@calcom/lib/server";

export const getServerSideProps = async function getServerSideProps(context: GetServerSidePropsContext) {
  return getRoutedUrl(context);
};
