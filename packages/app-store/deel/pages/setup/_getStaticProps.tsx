import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let deelApiKey = "";
  let hrisProfileId = "";
  const appKeys = await getAppKeysFromSlug("deel");
  if (typeof appKeys.deelApiKey === "string" && typeof appKeys.hrisProfileId === "string") {
    deelApiKey = appKeys.deelApiKey;
    hrisProfileId = appKeys.hrisProfileId;
  }

  return {
    props: {
      deelApiKey,
      hrisProfileId,
    },
  };
};
