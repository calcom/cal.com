import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  console.log("props");
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let publicKey = "";
  let accessToken = "";
  const appKeys = await getAppKeysFromSlug("mercado_pago");
  if (typeof appKeys.public_key === "string" && typeof appKeys.access_token === "string") {
    publicKey = appKeys.public_key;
    accessToken = appKeys.access_token;
  }

  return {
    props: {
      publicKey,
      accessToken,
    },
  };
};
