import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhook_update_form"),
    () => ""
  );

export default WithLayout({
  getLayout: null,
  Page: EditWebhooksView,
});
