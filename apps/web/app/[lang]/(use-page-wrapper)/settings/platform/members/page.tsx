import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("platform_members"), t("platform_members_description"));
};

const ServerPageWrapper = () => {
  return <PlatformMembersView />;
};

export default ServerPageWrapper;
