import { _generateMetadata } from "app/_utils";

import { StudioLayout } from "~/admin-dataview/components/StudioLayout";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Data Studio",
    () => "Browse and manage Cal.com data",
    undefined,
    undefined,
    "/admin/data"
  );

export default function AdminDataStudioPage() {
  return <StudioLayout slug={null} />;
}
