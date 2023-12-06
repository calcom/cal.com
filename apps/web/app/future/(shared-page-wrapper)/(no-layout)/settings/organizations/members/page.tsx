import Page from "@pages/settings/organizations/members";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

export default Page;
