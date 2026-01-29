import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;

  const appKeys = await getAppKeysFromSlug("lawpay");
  const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";

  return {
    props: { clientId },
  };
};
