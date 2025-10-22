import { _generateMetadata } from "app/_utils";

import { Icon } from "@calcom/ui";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("guest_confirmed"),
    (t) => t("guest_confirmed_description")
  );
};

const Page = async () => {
  return (
    <div className="flex h-screen">
      <div className="bg-default m-auto max-w-md rounded-md p-10 text-center">
        <div className="bg-success mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="check" className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-emphasis mb-4 text-2xl font-medium">
          You've been added to the meeting as a guest
        </h1>
        <p className="text-default text-sm">
          You will receive a calendar invitation with all the meeting details.
        </p>
      </div>
    </div>
  );
};

export default Page;
