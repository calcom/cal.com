import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/teams/pages/team-appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

export default Page;
