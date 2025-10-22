import { _generateMetadata } from "app/_utils";

import { Icon } from "@calcom/ui/components/icon";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("guest_confirmation_failed"),
    (t) => t("guest_confirmation_failed_description")
  );
};

const Page = async () => {
  return (
    <div className="flex h-screen">
      <div className="bg-default m-auto max-w-md rounded-md p-10 text-center">
        <div className="bg-error mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="x" className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-emphasis mb-4 text-2xl font-medium">Unable to verify confirmation code</h1>
        <p className="text-default text-sm">
          You've not been added to the meeting. The verification code may have expired or is invalid.
        </p>
      </div>
    </div>
  );
};

export default Page;
