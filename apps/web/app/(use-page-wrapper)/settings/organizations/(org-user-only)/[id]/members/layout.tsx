import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { getTranslate } from "app/_utils";
import Shell from "~/shell/Shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();

  return (
    <Shell
      withoutMain={false}
      disableSticky={true}
      heading={t("organization_members")}
      subtitle={t("organization_description")}
      headerClassName="hidden md:block"
      actions={<div className={`mb-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
      {children}
    </Shell>
  );
}
