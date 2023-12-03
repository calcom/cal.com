import Page from "@pages/settings/admin/organizations/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("orgs_page_description")
  );

export default function AppPage() {
  // @ts-expect-error FIXME Property 'Component' is incompatible with index signature
  return <Page />;
}
