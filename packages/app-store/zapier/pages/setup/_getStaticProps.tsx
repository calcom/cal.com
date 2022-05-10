import { GetStaticPropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export interface IZapierSetupProps {
  inviteLink: string;
}

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  let zapierInviteLink = "";
  const appKeys = await getAppKeysFromSlug("zapier");
  if (typeof appKeys.invite_link === "string") zapierInviteLink = appKeys.invite_link;

  return {
    props: {
      zapierInviteLink,
    },
  };
};
