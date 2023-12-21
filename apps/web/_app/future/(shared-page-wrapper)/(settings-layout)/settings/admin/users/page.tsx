import { _generateMetadata } from "_app/_utils";

import Page from "@calcom/features/ee/users/pages/users-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Users",
    () => "A list of all the users in your account including their name, title, email and role."
  );

export default Page;
