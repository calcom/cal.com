import { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let apiKey = "";
  const appKeys = await getAppKeysFromSlug("zapier");
  if (typeof appKeys.apiKey === "string") apiKey = appKeys.apiKey;

  return {
    props: {
      apiKey,
    },
  };
};
