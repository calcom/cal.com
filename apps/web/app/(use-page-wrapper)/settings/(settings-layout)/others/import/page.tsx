import ImportLayout from "@calid/features/modules/calendly_import/components/ImportLayout";

import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  return await _generateMetadata(
    (t) => `${t("import")}`,
    (t) => `${t("calendly_import")}`,
    undefined,
    undefined,
    `/settings/others/import`
  );
};

// This is now a Server Component
export default function ImportPage() {
  return <ImportLayout />;
}