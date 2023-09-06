import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";
import { appKeysSchema } from "../../zod";

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let clientId = "";
  let secretKey = "";
  const appKeys = await getAppKeysFromSlug("amazon-s3-file-upload");

  const data = appKeysSchema.safeParse({ client_id: appKeys?.client_id, secret_key: appKeys?.secret_key });

  if (data.success) {
    clientId = data.data.client_id;
    secretKey = data.data.client_secret;
  }
  return {
    props: {
      clientId,
      secretKey,
    },
  };
};
