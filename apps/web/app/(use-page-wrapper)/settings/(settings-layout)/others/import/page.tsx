"use client";

// import { _generateMetadata, getTranslate } from "app/_utils";
import { Checkbox, Button } from "@calid/features/ui";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

// export const generateMetadata = async () =>
//   await _generateMetadata(
//     (t) => t("import"),
//     (t) => t("import_configuration"),
//     undefined,
//     undefined,
//     "/settings/others/import"
//   );

const ImportView = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader
      title={t("import")}
      description={t("import_configuration", { appName: APP_NAME })}
      borderInShellHeader={false}>
      <div className="items-center justify-between border-subtle my-6 flex flex-row rounded-md border p-6">
        <div>
          <div className="text-base font-medium">{t("calendly_import")}</div>
          <div className="mt-2 flex w-full flex-row items-center gap-2">
            <Checkbox className="h-4 w-4" />
            <div className="text-emphasis text-xs">{t("notify_calendly_import")}</div>
          </div>
        </div>
        <Button size="base" StartIcon="download" className="my-1">
          {t('import')}
        </Button>
      </div>
    </SettingsHeader>
  );
};

export default ImportView;
