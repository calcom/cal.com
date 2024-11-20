import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let clientId = "";
  let secretKey = "";
  const appKeys = await getAppKeysFromSlug("paypal");
  if (typeof appKeys.client_id === "string" && typeof appKeys.secret_key === "string") {
    clientId = appKeys.client_id;
    secretKey = appKeys.secret_key;
  }

  return {
    props: {
      clientId,
      secretKey,
    },
  };
};
