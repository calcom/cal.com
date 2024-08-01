import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui";

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  isAdminOrOwner: boolean;
}

export const AllowSeoIndexingSwitch = ({ currentOrg, isAdminOrOwner }: GeneralViewProps) => {
  const { t } = useLocale();
  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });
  const [isAllowSEOIndexingChecked, setIsAllowSEOIndexingChecked] = useState(!!currentOrg.allowSEOIndexing);

  if (!isAdminOrOwner) return null;

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("seo_indexing")}
        description={t("allow_seo_indexing")}
        disabled={mutation.isPending}
        checked={isAllowSEOIndexingChecked}
        onCheckedChange={(checked) => {
          setIsAllowSEOIndexingChecked(checked);
          mutation.mutate({ allowSEOIndexing: checked });
        }}
        switchContainerClassName="mt-6"
      />
    </>
  );
};
