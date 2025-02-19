import type { PageProps } from "app/_types";

import { APP_NAME } from "@calcom/lib/constants";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { Button } from "@calcom/ui";

import { getSeverTranslation } from "../dictionaries";
import { generateMetadataStatic } from "../metadata";

export const generateMetadata = async ({ params }: PageProps) => {
  const { t } = getSeverTranslation(params.lang as string);
  return await generateMetadataStatic(
    "/maintenance",
    t("under_maintenance"),
    t("under_maintenance_description", { appName: APP_NAME })
  );
};

const ServerPage = async ({ params }: PageProps) => {
  const { t } = getSeverTranslation(params.lang as string);

  return (
    <div className="bg-subtle flex h-screen">
      <div className="bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="text-emphasis text-2xl font-medium">{t("under_maintenance")}</h1>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">
          {t("under_maintenance_description", { appName: APP_NAME })}
        </p>
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
      </div>
    </div>
  );
};

export default ServerPage;

export const dynamic = "force-static";
