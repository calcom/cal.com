import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";

import YournameView from "~/yourname/yourname-view";

export const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("yourname_title_page"),
    (t) => t("yourname_description_page"),
    undefined,
    undefined,
    "/yourname"
  );

export default function YournamePage() {
  return <YournameView />;
}
