import { getTranslate } from "app/_utils";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import Shell from "@calcom/features/shell/Shell";
import { Button } from "@calcom/ui/components/button";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();

  return (
    <Shell
      heading={
        <div className="flex">
          <h1>Member management</h1>
          <Button
            tooltip="Only teammates invited as admins can create OAuth clients while teammates invited as members have read only access"
            tooltipSide="right"
            className="mx-2 hover:bg-transparent"
            color="minimal"
            variant="icon"
            StartIcon="info"
          />
        </div>
      }
      title={t("platform_members")}
      subtitle={t("platform_members_description")}
      withoutMain={false}
      isPlatformUser={true}
      actions={<div className={CTA_CONTAINER_CLASS_NAME} />}>
      {children}
    </Shell>
  );
}
