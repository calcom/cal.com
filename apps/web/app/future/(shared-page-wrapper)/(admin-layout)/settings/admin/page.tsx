import Page from "@pages/settings/admin/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Admin",
    () => "admin_description"
  );

export default Page;
