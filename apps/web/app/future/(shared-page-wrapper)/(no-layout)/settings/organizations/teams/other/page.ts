import Page from "@pages/settings/organizations/teams/other/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

export default Page;
