import { _generateMetadata } from "app/_utils";

import { StudioLayout } from "~/admin-dataview/components/StudioLayout";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "SQL Query — Data Studio",
    () => "Run read-only SQL queries against the database",
    undefined,
    undefined,
    "/admin/data/sql"
  );

export default function AdminSqlQueryPage() {
  return <StudioLayout slug="__sql__" />;
}
