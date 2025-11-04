import { _generateMetadata, getTranslate } from "app/_utils";

import { Icon } from "@calcom/ui/components/icon";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("guest_confirmation_failed"),
    (t) => t("guest_confirmation_failed_description")
  );
};

const Page = async () => {
  const t = await getTranslate();

  return (
    <div className="flex h-screen">
      <div className="bg-default m-auto max-w-md rounded-md p-10 text-center">
        <div className="bg-error mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="x" className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-emphasis mb-4 text-2xl font-medium">{t("guest_confirmation_failed_heading")}</h1>
        <p className="text-default text-sm">{t("guest_confirmation_failed_message")}</p>
      </div>
    </div>
  );
};

export default Page;
