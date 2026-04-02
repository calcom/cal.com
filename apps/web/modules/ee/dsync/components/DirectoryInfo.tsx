import type { Directory } from "@boxyhq/saml-jackson";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

const DirectoryInfo = ({ directory }: { directory: Directory }) => {
  const { t } = useLocale();

  return (
    <div className="stack-y-8">
      <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
        {t("directory_sync_info_description")}
      </p>
      <div className="flex flex-col">
        <div className="flex">
          <Label>{t("directory_scim_url")}</Label>
        </div>
        <div className="flex">
          <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
            {directory.scim.endpoint}
          </code>
          <Tooltip side="top" content={t("copy_to_clipboard")}>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${directory.scim.endpoint}`);
                showToast(t("directory_scim_url_copied"), "success");
              }}
              type="button"
              className="rounded-l-none text-base"
              StartIcon="clipboard">
              {t("copy")}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex">
          <Label>{t("directory_scim_token")}</Label>
        </div>
        <div className="flex">
          <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
            {directory.scim.secret}
          </code>
          <Tooltip side="top" content={t("copy_to_clipboard")}>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${directory.scim.secret}`);
                showToast(t("directory_scim_token_copied"), "success");
              }}
              type="button"
              className="rounded-l-none text-base"
              StartIcon="clipboard">
              {t("copy")}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default DirectoryInfo;
