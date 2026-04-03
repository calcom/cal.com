import { _generateMetadata } from "app/_utils";
import type { SearchParams } from "app/_types";

import Authorize from "~/auth/oauth2/authorize-view";
import EmbedAuthorize from "~/auth/oauth2/embed-authorize-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("authorize"),
    () => "",
    undefined,
    undefined,
    "/auth/oauth2/authorize"
  );
};

const ServerPageWrapper = async ({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const searchParams = await searchParamsPromise;
  const isEmbed = searchParams?.onboardingEmbed === "true";

  if (isEmbed) {
    return <EmbedAuthorize />;
  }

  return <Authorize />;
};

export default ServerPageWrapper;
