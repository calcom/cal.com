import { _generateMetadata } from "_app/_utils";

import Page from "@calcom/features/ee/users/pages/users-add-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Add new user",
    () => "Here you can add a new user."
  );

export default Page;
