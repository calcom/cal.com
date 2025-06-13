import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    `/settings/organizations/${(await params).id}/members`
  );

export { default } from "../../members/page";
