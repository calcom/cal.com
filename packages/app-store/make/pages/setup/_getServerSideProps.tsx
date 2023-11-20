import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";

export interface IMakeSetupProps {
  inviteLink: string;
}

export const getServerSideProps = async (_req: NextApiRequest, _res: NextApiResponse) => {
  let inviteLink = "";
  const appKeys = await getAppKeysFromSlug("make");
  if (typeof appKeys.invite_link === "string") inviteLink = appKeys.invite_link;

  return {
    props: {
      inviteLink,
    },
  };
};
