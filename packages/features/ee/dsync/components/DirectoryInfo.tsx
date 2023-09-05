import type { Directory } from "@boxyhq/saml-jackson";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast, Label, Tooltip } from "@calcom/ui";
import { Clipboard } from "@calcom/ui/components/icon";

const DirectoryInfo = ({ directory }: { directory: Directory }) => {
  const { t } = useLocale();

  return (
    <div className="space-y-8">
      <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
        Your Identity Provider will ask for the following information to configure SCIM. Follow the
        instructions to finish the setup.
      </p>
      <div className="flex flex-col">
        <div className="flex">
          <Label>SCIM Base URL</Label>
        </div>
        <div className="flex">
          <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
            {directory.scim.endpoint}
          </code>
          <Tooltip side="top" content={t("copy_to_clipboard")}>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${directory.scim.endpoint}`);
                showToast("SCIM Base URL copied", "success");
              }}
              type="button"
              className="rounded-l-none text-base"
              StartIcon={Clipboard}>
              {t("copy")}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex">
          <Label>SCIM Bearer Token</Label>
        </div>
        <div className="flex">
          <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
            {directory.scim.secret}
          </code>
          <Tooltip side="top" content={t("copy_to_clipboard")}>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${directory.scim.secret}`);
                showToast("SCIM Bearer Token copied", "success");
              }}
              type="button"
              className="rounded-l-none text-base"
              StartIcon={Clipboard}>
              {t("copy")}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default DirectoryInfo;
