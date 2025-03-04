import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import ManagedUsersView from "~/settings/platform/managed-users/managed-users-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("platform_members"), t("platform_members_description"));
};

const ServerPageWrapper = () => {
  return <ManagedUsersView />;
};

export default ServerPageWrapper;
