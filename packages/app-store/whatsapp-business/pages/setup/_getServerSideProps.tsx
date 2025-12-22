import type { GetServerSidePropsContext } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export interface IZapierSetupProps {
  inviteLink: string;
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;

  if (typeof ctx.params?.slug !== "string") return notFound;

  const calIdTeamId = ctx.query?.calIdTeamId;

  return {
    props: {
      calIdTeamId: calIdTeamId,
    },
  };
};
