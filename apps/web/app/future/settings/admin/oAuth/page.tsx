import { _generateMetadata } from "app/_utils";

import OAuthView from "~/settings/admin/oauth/oauth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth",
    () => "Add new OAuth Clients"
  );

export default OAuthView;
