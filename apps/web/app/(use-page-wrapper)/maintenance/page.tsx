import { _generateMetadata } from "app/_utils";

import { APP_NAME } from "@calcom/lib/constants";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { Button } from "@calcom/ui";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("under_maintenance"),
    (t) => t("under_maintenance_description", { appName: APP_NAME })
  );
};

const ServerPage = async () => {
  return (
    <div className="bg-subtle flex h-screen">
      <div className="bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="text-emphasis text-2xl font-medium">Down for maintenance</h1>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">
          The Cal.com team are performing scheduled maintenance. If you have any questions, please contact
          support.
        </p>
        <Button href={`${WEBSITE_URL}/support`}>Contact Support</Button>
      </div>
    </div>
  );
};

export default ServerPage;

export const dynamic = "force-static";
