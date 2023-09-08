import type { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export interface IMakeSetupProps {
  inviteLink: string;
}

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let inviteLink = "";
  const appKeys = await getAppKeysFromSlug("make");
  if (typeof appKeys.invite_link === "string") inviteLink = appKeys.invite_link;

  return {
    props: {
      inviteLink,
    },
  };
};
